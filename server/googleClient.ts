import { google } from 'googleapis'
import fs from 'fs'
import { config } from './config.js'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
]

export function getGoogleAuth() {
  try {
    if (config.serviceAccountJson) {
      const credentials = JSON.parse(config.serviceAccountJson)
      return new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: SCOPES,
      })
    }

    if (fs.existsSync(config.serviceAccountPath)) {
      const credentials = JSON.parse(fs.readFileSync(config.serviceAccountPath, 'utf8'))
      return new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: SCOPES,
      })
    }
  } catch (err) {
    console.error('Errore durante l\'inizializzazione di Google Auth:', err)
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

