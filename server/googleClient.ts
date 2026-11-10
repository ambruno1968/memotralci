import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'
import fs from 'fs'
import path from 'path'
import { config } from './config.js'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
]

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), 'local_storage')
const TOKENS_PATH = path.join(LOCAL_STORAGE_DIR, 'tokens.json')

export interface CredentialInspection {
  type: 'service_account' | 'oauth_client' | 'none'
  clientEmail?: string
  clientId?: string
  projectId?: string
  hasPrivateKey?: boolean
  hasClientSecret?: boolean
  raw?: any
}

export function inspectCredentials(): CredentialInspection {
  try {
    let raw: any = null
    if (config.serviceAccountJson) {
      raw = JSON.parse(config.serviceAccountJson)
    } else if (fs.existsSync(config.serviceAccountPath)) {
      raw = JSON.parse(fs.readFileSync(config.serviceAccountPath, 'utf8'))
    }

    if (!raw) return { type: 'none' }

    // Case 1: Real Service Account Key
    if (raw.type === 'service_account' || (raw.client_email && raw.private_key)) {
      return {
        type: 'service_account',
        clientEmail: raw.client_email,
        projectId: raw.project_id,
        hasPrivateKey: Boolean(raw.private_key),
        raw,
      }
    }

    // Case 2: OAuth 2.0 Web Client or Installed Client
    const oauthData = raw.web || raw.installed
    if (oauthData && oauthData.client_id) {
      return {
        type: 'oauth_client',
        clientId: oauthData.client_id,
        projectId: oauthData.project_id,
        hasClientSecret: Boolean(oauthData.client_secret),
        raw,
      }
    }
  } catch (err) {
    console.error('[Google Auth] Errore parsing credenziali:', err)
  }
  return { type: 'none' }
}

export function isOAuthConnected(): boolean {
  return fs.existsSync(TOKENS_PATH) && fs.statSync(TOKENS_PATH).size > 10
}

export function createOAuth2Client(redirectUri?: string): OAuth2Client | null {
  const creds = inspectCredentials()
  if (creds.type !== 'oauth_client' || !creds.raw) return null

  const oauthData = creds.raw.web || creds.raw.installed || {}
  const effectiveRedirectUri =
    redirectUri ||
    'http://localhost:3001/api/auth/google/callback'

  const oauth2Client = new google.auth.OAuth2(
    oauthData.client_id,
    oauthData.client_secret,
    effectiveRedirectUri
  )

  oauth2Client.on('tokens', (tokens) => {
    try {
      let currentTokens: any = {}
      if (fs.existsSync(TOKENS_PATH)) {
        currentTokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'))
      }
      const merged = { ...currentTokens, ...tokens }
      if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
        fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true })
      }
      fs.writeFileSync(TOKENS_PATH, JSON.stringify(merged, null, 2), 'utf8')
      console.log('[Google Auth] Token OAuth2 aggiornati e salvati con successo.')
    } catch (err) {
      console.error('[Google Auth] Errore salvataggio token:', err)
    }
  })

  return oauth2Client
}

export function getGoogleAuth(): any {
  const creds = inspectCredentials()

  // 1. Service Account (JWT)
  if (creds.type === 'service_account' && creds.clientEmail && creds.raw?.private_key) {
    try {
      return new google.auth.JWT({
        email: creds.clientEmail,
        key: creds.raw.private_key,
        scopes: SCOPES,
      })
    } catch (err) {
      console.error('[Google Auth] Errore inizializzazione JWT Service Account:', err)
    }
  }

  // 2. OAuth 2.0 Web Client with saved tokens
  if (creds.type === 'oauth_client' && isOAuthConnected()) {
    try {
      const oauth2Client = createOAuth2Client()
      if (oauth2Client) {
        const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'))
        oauth2Client.setCredentials(tokens)
        return oauth2Client
      }
    } catch (err) {
      console.error('[Google Auth] Errore inizializzazione client OAuth2:', err)
    }
  }

  return null
}

export function getCalendarClient() {
  const auth = getGoogleAuth()
  if (!auth) return null
  return google.calendar({ version: 'v3', auth })
}

export function getDriveClient() {
  const auth = getGoogleAuth()
  if (!auth) return null
  return google.drive({ version: 'v3', auth })
}

export function getOAuthAuthUrl(redirectUri?: string): string | null {
  const oauth2 = createOAuth2Client(redirectUri)
  if (!oauth2) return null
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })
}

export async function handleOAuthCallback(code: string, redirectUri?: string) {
  const oauth2 = createOAuth2Client(redirectUri)
  if (!oauth2) throw new Error('Client OAuth non configurato o non valido')

  const { tokens } = await oauth2.getToken(code)
  oauth2.setCredentials(tokens)

  if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
    fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true })
  }
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2), 'utf8')
  console.log('[Google Auth] Connessione OAuth completata con successo!')
  return tokens
}

export function disconnectOAuthTokens() {
  if (fs.existsSync(TOKENS_PATH)) {
    fs.unlinkSync(TOKENS_PATH)
    console.log('[Google Auth] Token OAuth rimossi.')
  }
}
