// src/services/googleClientSide.ts
// Modulo client-side autonomo per Google Identity Services (GIS), Google Calendar v3 e Google Drive v3
// Funziona al 100% nel browser (GitHub Pages PWA o localhost) senza dipendere da backend

import type { AppCalendarEvent } from '../types/event.ts'
import type { UploadedAttachment } from '../types/attachment.ts'
import type { AppTaskItem } from '../types/task.ts'
import type { CategoriesCloudPayload } from '../types/category.ts'
import { localDB } from './db.ts'

export interface GoogleUserInfo {
  id?: string
  email?: string
  name?: string
  picture?: string
  verified_email?: boolean
}

// Configurazione predefinita per l'account della Segreteria Come Tralci
export const GOOGLE_DEFAULTS = {
  clientId: '944725762658-ocihkj4r8b5usbitr35p32ai0agkubkb.apps.googleusercontent.com',
  calendarName: 'Segreteria',
  calendarEmail: 'segreteria.cometralcinovara@gmail.com',
  driveFolderName: 'Allegati memotralci',
  driveFolderId: '1HMcovycbLn9TKAXs1CmrcSylcDZj0GXc',
  taskArchiveFolderId: '1P-04yPjLhwQrPbR2oiMyxIeI6Z2l69zD',
  scopes: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid',
  ].join(' '),
}

const STORAGE_KEYS = {
  TOKEN: 'memotralci_google_token',
  TOKEN_EXPIRES: 'memotralci_google_token_exp',
  REFRESH_TOKEN: 'memotralci_google_refresh_token',
  CLIENT_SECRET: 'memotralci_google_client_secret',
  USER: 'memotralci_google_user',
  EXPLICIT_LOGOUT: 'memotralci_google_explicit_logout',
  CALENDAR_ID: 'memotralci_resolved_cal_id',
  FOLDER_ID: 'memotralci_resolved_folder_id',
  TASK_FOLDER_ID: 'memotralci_task_folder_id',
  RECENT_EVENTS: 'memotralci_recent_events_v2',
  DELETED_EVENTS: 'memotralci_deleted_events_v2',
}

// Helper per spostare una data YYYY-MM-DD di +N o -N giorni (per end.date esclusivo di Google Calendar)
function shiftDateOnly(dateStr: string, days: number): string {
  const clean = dateStr.split('T')[0]
  const parts = clean.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return clean
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days))
  return dt.toISOString().split('T')[0]
}

class GoogleClientSide {
  private gisPromise: Promise<void> | null = null
  private cachedCalendarId: string | null = null
  private cachedFolderId: string | null = null
  private cachedTaskFolderId: string | null = null
  private refreshTimer: any = null
  private refreshPromise: Promise<string | null> | null = null
  public lastAuthError: boolean = false

  constructor() {
    this.cachedCalendarId = localStorage.getItem(STORAGE_KEYS.CALENDAR_ID)
    this.cachedFolderId = localStorage.getItem(STORAGE_KEYS.FOLDER_ID)
    this.cachedTaskFolderId = localStorage.getItem(STORAGE_KEYS.TASK_FOLDER_ID)

    this.restoreSessionFromIndexedDB()
    this.setupLifecycleListeners()
    this.scheduleAutoRefresh()
  }

  // Ripristina o sincronizza la sessione persistente salvata in IndexedDB per evitare disconnessioni
  private async restoreSessionFromIndexedDB() {
    try {
      const explicitLogout = localStorage.getItem(STORAGE_KEYS.EXPLICIT_LOGOUT) === 'true'
      const savedSession = await localDB.getAuthSession()

      if (savedSession?.explicitlyDisconnected || explicitLogout) {
        return
      }

      if (savedSession) {
        if (!localStorage.getItem(STORAGE_KEYS.USER) && savedSession.user) {
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(savedSession.user))
        }
        if (!localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) && savedSession.refreshToken) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, savedSession.refreshToken)
        }
        if (
          !localStorage.getItem(STORAGE_KEYS.TOKEN) &&
          savedSession.token &&
          savedSession.tokenExpires &&
          savedSession.tokenExpires > Date.now()
        ) {
          localStorage.setItem(STORAGE_KEYS.TOKEN, savedSession.token)
          localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES, String(savedSession.tokenExpires))
        }
      }

      const currentRefresh = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
      const currentUser = this.getUserInfo()
      if (currentUser || currentRefresh) {
        await this.persistSessionToIndexedDB()
      }

      // Se il token di accesso è assente o in scadenza, rinnovalo subito silenziosamente via HTTP
      if (!this.getToken() && this.isConnected()) {
        this.silentRefreshToken().catch(() => { })
      }
    } catch (e) {
      console.warn('[Google Auth] Errore ripristino sessione da IndexedDB:', e)
    }
  }

  private async persistSessionToIndexedDB() {
    try {
      const user = this.getUserInfo()
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
      const exp = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES)
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
      const explicitlyDisconnected = localStorage.getItem(STORAGE_KEYS.EXPLICIT_LOGOUT) === 'true'

      await localDB.saveAuthSession({
        token,
        tokenExpires: exp ? Number(exp) : null,
        refreshToken,
        user,
        calendarId: this.cachedCalendarId,
        folderId: this.cachedFolderId,
        taskFolderId: this.cachedTaskFolderId,
        explicitlyDisconnected,
      })
    } catch { }
  }

  // Monitora visibilità pagina, ritorno online e focus per rinnovare automaticamente il token
  private setupLifecycleListeners() {
    if (typeof window === 'undefined') return

    const checkAndRefresh = () => {
      if (!this.isConnected()) return
      const exp = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES)
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
      if (!token || !exp || Number(exp) - Date.now() < 15 * 60 * 1000) {
        this.silentRefreshToken().catch(() => { })
      }
    }

    window.addEventListener('focus', checkAndRefresh)
    window.addEventListener('online', checkAndRefresh)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkAndRefresh()
      }
    })
  }

  // Carica script Google Identity Services
  public loadGis(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      return Promise.resolve()
    }
    if (this.gisPromise) return this.gisPromise

    this.gisPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
      if (existing) {
        existing.addEventListener('load', () => resolve())
        existing.addEventListener('error', () => reject(new Error('Errore caricamento GIS')))
        return
      }

      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => {
        this.gisPromise = null
        reject(new Error('Impossibile caricare Google Identity Services. Controlla la connessione internet.'))
      }
      document.head.appendChild(script)
    })
    return this.gisPromise
  }

  // Verifica se è presente un account collegato (non si sgancia mai alla scadenza oraria del token!)
  public isConnected(): boolean {
    try {
      if (localStorage.getItem(STORAGE_KEYS.EXPLICIT_LOGOUT) === 'true') {
        return false
      }
    } catch { }

    const token = this.getToken()
    if (token && token.trim().length > 10) return true

    const refreshToken = this.getRefreshToken()
    const user = this.getUserInfo()
    if ((user && user.email) || refreshToken) {
      this.silentRefreshToken().catch(() => { })
      return true
    }
    return false
  }

  public getRefreshToken(): string | null {
    try {
      if (localStorage.getItem(STORAGE_KEYS.EXPLICIT_LOGOUT) === 'true') return null
      const saved = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
      if (saved && saved.trim().length > 10) return saved.trim()
      return null
    } catch {
      return null
    }
  }

  public getToken(): string | null {
    try {
      if (localStorage.getItem(STORAGE_KEYS.EXPLICIT_LOGOUT) === 'true') return null
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
      const exp = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES)
      if (exp) {
        const expNum = Number(exp)
        // Se mancano meno di 10 minuti, avvia il rinnovo in background
        if (Date.now() > expNum - 10 * 60 * 1000) {
          this.silentRefreshToken().catch(() => { })
        }
        if (Date.now() > expNum) {
          return null
        }
      }
      return token
    } catch {
      return null
    }
  }

  public async getValidToken(): Promise<string | null> {
    const current = this.getToken()
    if (current) return current

    // Se scaduto o mancante, rinnova immediatamente (tramite refresh_token HTTP senza popup)
    if (this.isConnected()) {
      return await this.silentRefreshToken()
    }
    return null
  }

  public setToken(token: string, expiresInSeconds: number = 3600, refreshToken?: string) {
    try {
      localStorage.removeItem(STORAGE_KEYS.EXPLICIT_LOGOUT)
      localStorage.setItem(STORAGE_KEYS.TOKEN, token.trim())
      const expTime = Date.now() + Math.max(300, expiresInSeconds - 90) * 1000
      localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES, String(expTime))
      if (refreshToken && refreshToken.trim().length > 10) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken.trim())
      }
      this.persistSessionToIndexedDB()
      this.scheduleAutoRefresh(expiresInSeconds)
    } catch (e) {
      console.warn('Errore salvataggio token:', e)
    }
  }

  // Programma il rinnovo automatico prima della scadenza
  public scheduleAutoRefresh(expiresInSeconds?: number) {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }

    let delayMs = 45 * 60 * 1000 // Default 45 minuti
    if (expiresInSeconds && expiresInSeconds > 600) {
      delayMs = (expiresInSeconds - 300) * 1000
    } else {
      const exp = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES)
      if (exp) {
        delayMs = Math.max(15000, Number(exp) - Date.now() - 300000)
      }
    }

    this.refreshTimer = setTimeout(() => {
      this.silentRefreshToken().catch((err) => {
        console.warn('[Google Auth] Rinnovo schedulato fallito:', err)
      })
    }, delayMs)
  }

  // Invalida solo l'access_token scaduto SENZA MAI cancellare l'account utente o il refresh_token!
  private invalidateExpiredAccessToken() {
    try {
      localStorage.removeItem(STORAGE_KEYS.TOKEN)
      localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES)
    } catch { }
  }

  // Chiamato SOLO quando l'utente clicca esplicitamente su "Disconnetti"
  public clearToken() {
    try {
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer)
        this.refreshTimer = null
      }
      localStorage.setItem(STORAGE_KEYS.EXPLICIT_LOGOUT, 'true')
      localStorage.removeItem(STORAGE_KEYS.TOKEN)
      localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES)
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
      localStorage.removeItem(STORAGE_KEYS.USER)
      localStorage.removeItem(STORAGE_KEYS.TASK_FOLDER_ID)
      this.cachedCalendarId = null
      this.cachedFolderId = null
      this.cachedTaskFolderId = null
      localDB.clearAuthSession().catch(() => { })
    } catch { }
  }

  public getUserInfo(): GoogleUserInfo | null {
    try {
      if (localStorage.getItem(STORAGE_KEYS.EXPLICIT_LOGOUT) === 'true') return null
      const data = localStorage.getItem(STORAGE_KEYS.USER)
      if (data) return JSON.parse(data)
      if (localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)) {
        return {
          email: GOOGLE_DEFAULTS.calendarEmail,
          name: 'Segreteria Come Tralci',
        }
      }
      return null
    } catch {
      return null
    }
  }

  // Rinnovo Silenzioso del Token in Background:
  // 1) Canale Primario: HTTP POST diretto se sono presenti credenziali di refresh in locale
  // 2) Canale Secondario: GIS Token Client silenzioso
  public async silentRefreshToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise

    this.refreshPromise = (async () => {
      try {
        // 1. Tenta prima il rinnovo diretto tramite refresh_token salvato localmente (se presente)
        const refreshToken = this.getRefreshToken()
        const clientSecret = localStorage.getItem(STORAGE_KEYS.CLIENT_SECRET)
        if (refreshToken && GOOGLE_DEFAULTS.clientId && clientSecret) {
          try {
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                client_id: GOOGLE_DEFAULTS.clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
              }),
            })

            if (tokenRes.ok) {
              const tokenData = await tokenRes.json()
              if (tokenData && tokenData.access_token) {
                const newAccessToken = tokenData.access_token
                const expiresIn = tokenData.expires_in ? Number(tokenData.expires_in) : 3600
                this.setToken(newAccessToken, expiresIn, refreshToken)

                // Se non avevamo ancora i dettagli profilo, salvali
                if (!localStorage.getItem(STORAGE_KEYS.USER)) {
                  const defaultUser: GoogleUserInfo = {
                    email: GOOGLE_DEFAULTS.calendarEmail,
                    name: 'Segreteria Come Tralci',
                  }
                  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(defaultUser))
                  this.persistSessionToIndexedDB()
                }
                return newAccessToken
              }
            }
          } catch (httpErr) {
            console.warn('[Google OAuth2] Errore temporaneo rete durante refresh HTTP:', httpErr)
          }
        }

        // 2. Fallback GIS client-side
        await this.loadGis()
        const user = this.getUserInfo()
        const oauth2 = (window as any).google?.accounts?.oauth2
        if (!oauth2) return null

        return await new Promise<string | null>((resolve) => {
          let resolved = false
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true
              resolve(null)
            }
          }, 8000)

          try {
            const client = oauth2.initTokenClient({
              client_id: GOOGLE_DEFAULTS.clientId,
              scope: GOOGLE_DEFAULTS.scopes,
              callback: (resp: any) => {
                if (resolved) return
                resolved = true
                clearTimeout(timeout)
                if (resp && resp.access_token) {
                  const token = resp.access_token
                  const expiresIn = resp.expires_in ? Number(resp.expires_in) : 3600
                  this.setToken(token, expiresIn)
                  resolve(token)
                } else {
                  resolve(null)
                }
              },
              error_callback: () => {
                if (resolved) return
                resolved = true
                clearTimeout(timeout)
                resolve(null)
              },
            })

            client.requestAccessToken({
              prompt: '',
              hint: user?.email || GOOGLE_DEFAULTS.calendarEmail,
            })
          } catch {
            if (!resolved) {
              resolved = true
              clearTimeout(timeout)
              resolve(null)
            }
          }
        })
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  // Esegue fetch verso le API Google gestendo automaticamente il rinnovo del token su 401 SENZA MAI scollegare l'account
  private async fetchWithAuth(url: string, init?: RequestInit): Promise<Response> {
    let token = await this.getValidToken()
    if (!token) {
      token = this.getToken()
    }

    const headers = new Headers(init?.headers || {})
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    let res = await fetch(url, { ...init, headers })

    // Se riceviamo 401 Unauthorized, invalida SOLO l'access_token scaduto, rinnova con refresh_token e riprova
    if (res.status === 401) {
      console.info('[Google API] Token scaduto (401), rinnovo automatico in corso...')
      this.invalidateExpiredAccessToken()
      const refreshed = await this.silentRefreshToken()
      if (refreshed) {
        this.lastAuthError = false
        headers.set('Authorization', `Bearer ${refreshed}`)
        res = await fetch(url, { ...init, headers })
      } else {
        this.lastAuthError = true
        console.warn('[Google API] Rinnovo posticipato (account mantenuto in locale).')
      }
    } else if (res.ok) {
      this.lastAuthError = false
    }

    return res
  }

  // Richiesta Accesso Google e memorizzazione permanente dell'account + refresh_token in locale
  public async signIn(): Promise<{ token: string; user: GoogleUserInfo }> {
    localStorage.removeItem(STORAGE_KEYS.EXPLICIT_LOGOUT)

    // Se abbiamo il refresh_token preconfigurato della Segreteria, tenta prima il collegamento istantaneo
    // oppure procedi con il popup OAuth per acquisire/aggiornare il refresh_token permanente
    await this.loadGis()

    return new Promise((resolve, reject) => {
      try {
        const oauth2 = (window as any).google.accounts.oauth2
        const clientSecret = localStorage.getItem(STORAGE_KEYS.CLIENT_SECRET)

        // Usa Code Client per ottenere anche il refresh_token permanente (offline access) se configurato in locale
        if (oauth2.initCodeClient && clientSecret) {
          const codeClient = oauth2.initCodeClient({
            client_id: GOOGLE_DEFAULTS.clientId,
            scope: GOOGLE_DEFAULTS.scopes,
            ux_mode: 'popup',
            select_account: true,
            callback: async (codeResp: any) => {
              if (codeResp && codeResp.code) {
                try {
                  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                      client_id: GOOGLE_DEFAULTS.clientId,
                      client_secret: clientSecret,
                      code: codeResp.code,
                      grant_type: 'authorization_code',
                      redirect_uri: 'postmessage',
                    }),
                  })

                  if (tokenRes.ok) {
                    const tokenData = await tokenRes.json()
                    const token = tokenData.access_token
                    const expiresIn = tokenData.expires_in ? Number(tokenData.expires_in) : 3600
                    const refreshToken =
                      tokenData.refresh_token ||
                      localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) ||
                      undefined

                    this.setToken(token, expiresIn, refreshToken)

                    let user: GoogleUserInfo = {
                      email: GOOGLE_DEFAULTS.calendarEmail,
                      name: 'Segreteria Come Tralci',
                    }
                    try {
                      const uRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                        headers: { Authorization: `Bearer ${token}` },
                      })
                      if (uRes.ok) {
                        user = await uRes.json()
                      }
                    } catch { }

                    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
                    await this.persistSessionToIndexedDB()

                    try {
                      await this.resolveCalendarId()
                      await this.resolveDriveFolderId()
                    } catch { }

                    resolve({ token, user })
                    return
                  }
                } catch (err) {
                  console.warn('Scambio codice OAuth fallito, uso token client:', err)
                }
              }

              // Fallback automatico a TokenClient se lo scambio codice non è riuscito
              this.signInWithTokenClient().then(resolve).catch(reject)
            },
            error_callback: () => {
              this.signInWithTokenClient().then(resolve).catch(reject)
            },
          })

          codeClient.requestCode()
          return
        }

        this.signInWithTokenClient().then(resolve).catch(reject)
      } catch (err: any) {
        reject(err)
      }
    })
  }

  private signInWithTokenClient(): Promise<{ token: string; user: GoogleUserInfo }> {
    return new Promise((resolve, reject) => {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_DEFAULTS.clientId,
          scope: GOOGLE_DEFAULTS.scopes,
          callback: async (resp: any) => {
            if (resp && resp.access_token) {
              const token = resp.access_token
              const expiresIn = resp.expires_in ? Number(resp.expires_in) : 3600
              const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || undefined
              this.setToken(token, expiresIn, refreshToken)

              let user: GoogleUserInfo = {
                email: GOOGLE_DEFAULTS.calendarEmail,
                name: 'Segreteria Come Tralci',
              }
              try {
                const uRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                  headers: { Authorization: `Bearer ${token}` },
                })
                if (uRes.ok) {
                  user = await uRes.json()
                }
              } catch { }

              localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
              await this.persistSessionToIndexedDB()

              try {
                await this.resolveCalendarId()
                await this.resolveDriveFolderId()
              } catch { }

              resolve({ token, user })
            } else {
              const err = resp?.error_description || resp?.error || 'Accesso Google annullato o fallito'
              reject(new Error(err))
            }
          },
          error_callback: (err: any) => {
            reject(new Error(err?.message || 'Accesso Google non completato'))
          },
        })

        client.requestAccessToken({ prompt: 'select_account' })
      } catch (err: any) {
        reject(err)
      }
    })
  }

  public signOut() {
    this.clearToken()
  }

  // ==========================================
  // BUFFER EVENTI RECENTI E TOMBSTONES
  // (Previene la scomparsa degli eventi appena creati su Google Calendar durante il sync)
  // ==========================================

  private rememberRecentEvent(evt: AppCalendarEvent) {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RECENT_EVENTS)
      const map: Record<string, { event: AppCalendarEvent; savedAt: number }> = raw ? JSON.parse(raw) : {}
      const now = Date.now()
      // Pulisci voci più vecchie di 10 minuti
      for (const k of Object.keys(map)) {
        if (now - map[k].savedAt > 10 * 60 * 1000) {
          delete map[k]
        }
      }
      map[evt.id] = { event: evt, savedAt: now }
      localStorage.setItem(STORAGE_KEYS.RECENT_EVENTS, JSON.stringify(map))
    } catch { }
  }

  private getRecentEvents(): AppCalendarEvent[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RECENT_EVENTS)
      if (!raw) return []
      const map: Record<string, { event: AppCalendarEvent; savedAt: number }> = JSON.parse(raw)
      const now = Date.now()
      const valid: AppCalendarEvent[] = []
      for (const k of Object.keys(map)) {
        if (now - map[k].savedAt <= 10 * 60 * 1000 && map[k].event) {
          valid.push(map[k].event)
        }
      }
      return valid
    } catch {
      return []
    }
  }

  private removeRecentEvent(id: string) {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RECENT_EVENTS)
      if (raw) {
        const map = JSON.parse(raw)
        delete map[id]
        localStorage.setItem(STORAGE_KEYS.RECENT_EVENTS, JSON.stringify(map))
      }
      const delRaw = localStorage.getItem(STORAGE_KEYS.DELETED_EVENTS)
      const delArr: string[] = delRaw ? JSON.parse(delRaw) : []
      if (!delArr.includes(id)) {
        delArr.push(id)
        localStorage.setItem(STORAGE_KEYS.DELETED_EVENTS, JSON.stringify(delArr.slice(-200)))
      }
    } catch { }
  }

  private getDeletedEventIds(): Set<string> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DELETED_EVENTS)
      return raw ? new Set(JSON.parse(raw)) : new Set()
    } catch {
      return new Set()
    }
  }

  // ==========================================
  // GOOGLE CALENDAR DIRECT INTEGRATION
  // ==========================================

  public async resolveCalendarId(): Promise<string> {
    if (this.cachedCalendarId) return this.cachedCalendarId

    try {
      const res = await this.fetchWithAuth(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=100'
      )

      if (res.ok) {
        const data = await res.json()
        const items: any[] = data.items || []

        // 1. Cerca calendario "Segreteria"
        const target = GOOGLE_DEFAULTS.calendarName.toLowerCase()
        const found =
          items.find((c) => c.summary && c.summary.toLowerCase().trim() === target) ||
          items.find((c) => c.summary && c.summary.toLowerCase().includes(target)) ||
          items.find((c) => c.id && c.id.toLowerCase().includes('segreteria')) ||
          items.find((c) => c.primary)

        if (found && found.id) {
          this.cachedCalendarId = found.id
          localStorage.setItem(STORAGE_KEYS.CALENDAR_ID, found.id)
          this.persistSessionToIndexedDB()
          return found.id
        }
      }
    } catch (e) {
      console.warn('[Google Calendar] Risoluzione id calendario fallita:', e)
    }

    return GOOGLE_DEFAULTS.calendarEmail || 'primary'
  }

  // Restituisce tutti gli ID calendario rilevanti (es. "Segreteria" + "primary") per non perdere mai
  // eventi creati direttamente su Google Calendar dal telefono o dal web
  private async resolveRelevantCalendarIds(): Promise<string[]> {
    const primaryCalId = await this.resolveCalendarId()
    const ids = new Set<string>([primaryCalId])

    try {
      const res = await this.fetchWithAuth(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=100'
      )
      if (res.ok) {
        const data = await res.json()
        const items: any[] = data.items || []
        const target = GOOGLE_DEFAULTS.calendarName.toLowerCase()

        for (const c of items) {
          if (!c?.id) continue
          // Ignora calendari di sistema (festività, compleanni contatti)
          if (c.id.includes('#holiday@') || c.id.includes('#contacts@')) continue

          const summary = (c.summary || '').toLowerCase()
          const idLower = c.id.toLowerCase()
          const isRelevant =
            c.primary === true ||
            summary.includes(target) ||
            idLower.includes('segreteria') ||
            idLower === GOOGLE_DEFAULTS.calendarEmail.toLowerCase()

          if (isRelevant) {
            ids.add(c.id)
          }
        }
      }
    } catch {
      // Se calendarList fallisce, aggiungi comunque 'primary' come fallback oltre a primaryCalId
      ids.add('primary')
    }

    return Array.from(ids)
  }

  private async fetchEventsFromSingleCalendar(
    calId: string,
    timeMin: string,
    timeMax: string
  ): Promise<any[]> {
    const allItems: any[] = []
    let pageToken: string | undefined = undefined

    do {
      const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calId
      )}/events?maxResults=2500&singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(
        timeMin
      )}&timeMax=${encodeURIComponent(timeMax)}${pageParam}`

      const res = await this.fetchWithAuth(url, { cache: 'no-store' })

      if (!res.ok) {
        throw new Error(`Errore Calendar Google (${res.status}): ${res.statusText}`)
      }

      const data = await res.json()
      if (Array.isArray(data.items)) {
        for (const item of data.items) {
          allItems.push({ ...item, __calendarId: calId })
        }
      }
      pageToken = data.nextPageToken
    } while (pageToken && allItems.length < 5000)

    return allItems
  }

  public async getCalendarEvents(): Promise<AppCalendarEvent[]> {
    const calendarIds = await this.resolveRelevantCalendarIds()
    // Intervallo esteso: da 1 anno nel passato fino a 5 anni nel futuro (nessun evento futuro viene mai tagliato fuori!)
    const timeMin = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
    const timeMax = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString()

    const results = await Promise.allSettled(
      calendarIds.map((cId) => this.fetchEventsFromSingleCalendar(cId, timeMin, timeMax))
    )

    const allItems: any[] = []
    const seenIds = new Set<string>()
    let anySuccess = false
    let firstError: any = null

    for (const r of results) {
      if (r.status === 'fulfilled') {
        anySuccess = true
        for (const item of r.value) {
          if (item?.id && !seenIds.has(item.id)) {
            seenIds.add(item.id)
            allItems.push(item)
          }
        }
      } else if (!firstError) {
        firstError = r.reason
      }
    }

    if (!anySuccess && firstError) {
      throw firstError
    }

    const deletedIds = this.getDeletedEventIds()

    const mappedEvents: AppCalendarEvent[] = allItems
      .filter((item) => item && item.status !== 'cancelled' && !deletedIds.has(item.id))
      .map((item) => {
        const isAllDay = Boolean(item.start?.date)
        const start = (isAllDay ? item.start?.date : item.start?.dateTime) || new Date().toISOString()
        let end = (isAllDay ? item.end?.date : item.end?.dateTime) || start

        // In Google Calendar API v3 end.date per gli eventi allDay è esclusivo (es. 11->12 per il solo giorno 11).
        // Riportiamolo alla data inclusiva usata nell'interfaccia se è successivo a start.
        if (isAllDay && item.start?.date && item.end?.date && item.end.date > item.start.date) {
          end = shiftDateOnly(item.end.date, -1)
        }

        let category: any = undefined
        let categories: string[] = []
        let attachments: any[] = []

        const extProps = item.extendedProperties?.private || item.extendedProperties?.shared
        if (extProps) {
          if (extProps.categories) {
            try {
              const parsed = JSON.parse(extProps.categories)
              if (Array.isArray(parsed)) {
                categories = parsed.filter(
                  (c: any) => typeof c === 'string' && c.trim() && c.trim().toLowerCase() !== 'altro'
                )
              }
            } catch { }
          }

          const rawCat = extProps.category
          if (typeof rawCat === 'string' && rawCat.trim() && rawCat.trim().toLowerCase() !== 'altro') {
            const splitCats = rawCat
              .split(',')
              .map((s: string) => s.trim())
              .filter((s: string) => Boolean(s) && s.toLowerCase() !== 'altro')
            for (const sc of splitCats) {
              if (!categories.includes(sc)) categories.push(sc)
            }
          }

          if (categories.length > 0) {
            category = categories.join(',')
          }

          if (extProps.attachments) {
            try {
              attachments = JSON.parse(extProps.attachments)
            } catch {
              attachments = []
            }
          }
        }

        return {
          id: item.id || `evt_${Date.now()}`,
          title: item.summary || '(Senza titolo)',
          description: item.description || '',
          location: item.location || '',
          start,
          end,
          allDay: isAllDay,
          category,
          categories,
          attachments,
          googleEventId: item.id,
          calendarId: item.__calendarId,
        }
      })

    // Unisci eventuali eventi appena salvati negli ultimi minuti che Google Calendar non avesse ancora indicizzato
    const recentEvents = this.getRecentEvents()
    const mappedIds = new Set(mappedEvents.map((e) => e.id))
    for (const rec of recentEvents) {
      if (!deletedIds.has(rec.id) && !mappedIds.has(rec.id)) {
        mappedEvents.push(rec)
      }
    }

    return mappedEvents
  }

  public async createCalendarEvent(eventData: Omit<AppCalendarEvent, 'id'>): Promise<AppCalendarEvent> {
    const calId = await this.resolveCalendarId()

    const startDateOnly = eventData.start.split('T')[0]
    const rawEndDateOnly = (eventData.end || eventData.start).split('T')[0]
    const inclusiveEndDateOnly = rawEndDateOnly < startDateOnly ? startDateOnly : rawEndDateOnly

    // Per eventi "Tutto il giorno" (allDay), Google Calendar richiede end.date esclusivo (+1 giorno)
    const startProp = eventData.allDay
      ? { date: startDateOnly }
      : { dateTime: new Date(eventData.start).toISOString() }
    const endProp = eventData.allDay
      ? { date: shiftDateOnly(inclusiveEndDateOnly, 1) }
      : { dateTime: new Date(eventData.end || eventData.start).toISOString() }

    const catsArray = Array.isArray(eventData.categories)
      ? eventData.categories.filter((c) => c && c.trim() && c.trim().toLowerCase() !== 'altro')
      : eventData.category && eventData.category.trim().toLowerCase() !== 'altro'
        ? eventData.category.split(',').map((s) => s.trim()).filter(Boolean)
        : []
    const catStr = catsArray.join(',')

    const body = {
      summary: eventData.title,
      description: eventData.description,
      location: eventData.location,
      start: startProp,
      end: endProp,
      extendedProperties: {
        private: {
          category: catStr,
          categories: JSON.stringify(catsArray),
          attachments: JSON.stringify(eventData.attachments || []),
          source: 'memotralci',
        },
        shared: {
          category: catStr,
          categories: JSON.stringify(catsArray),
          source: 'memotralci',
        },
      },
    }

    const res = await this.fetchWithAuth(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!res.ok) {
      throw new Error(`Errore creazione evento Google Calendar: ${res.statusText}`)
    }

    const item = await res.json()
    const createdEvent: AppCalendarEvent = {
      id: item.id,
      title: item.summary || eventData.title,
      description: item.description || eventData.description,
      location: item.location || eventData.location,
      start: eventData.allDay ? startDateOnly : item.start?.dateTime || eventData.start,
      end: eventData.allDay ? inclusiveEndDateOnly : item.end?.dateTime || eventData.end,
      allDay: eventData.allDay,
      category: catStr || undefined,
      categories: catsArray,
      attachments: eventData.attachments,
      googleEventId: item.id,
    }

    this.rememberRecentEvent(createdEvent)
    return createdEvent
  }

  public async updateCalendarEvent(id: string, eventData: Partial<AppCalendarEvent>): Promise<AppCalendarEvent> {
    const calId = eventData.calendarId || (await this.resolveCalendarId())

    const patchBody: any = {}
    if (eventData.title !== undefined) patchBody.summary = eventData.title
    if (eventData.description !== undefined) patchBody.description = eventData.description
    if (eventData.location !== undefined) patchBody.location = eventData.location

    const startDateOnly = (eventData.start || '').split('T')[0]
    const rawEndDateOnly = (eventData.end || eventData.start || '').split('T')[0]
    const inclusiveEndDateOnly = rawEndDateOnly < startDateOnly ? startDateOnly : rawEndDateOnly

    if (eventData.start !== undefined || eventData.allDay !== undefined) {
      patchBody.start = eventData.allDay
        ? { date: startDateOnly }
        : { dateTime: new Date(eventData.start || new Date()).toISOString() }
    }
    if (eventData.end !== undefined || eventData.allDay !== undefined) {
      patchBody.end = eventData.allDay
        ? { date: shiftDateOnly(inclusiveEndDateOnly, 1) }
        : { dateTime: new Date(eventData.end || new Date()).toISOString() }
    }

    const catsArray = Array.isArray(eventData.categories)
      ? eventData.categories.filter((c) => c && c.trim() && c.trim().toLowerCase() !== 'altro')
      : eventData.category && eventData.category.trim().toLowerCase() !== 'altro'
        ? eventData.category.split(',').map((s) => s.trim()).filter(Boolean)
        : []
    const catStr = catsArray.join(',')

    if (eventData.categories !== undefined || eventData.category !== undefined || eventData.attachments !== undefined) {
      patchBody.extendedProperties = {
        private: {
          category: catStr,
          categories: JSON.stringify(catsArray),
          attachments: JSON.stringify(eventData.attachments || []),
          source: 'memotralci',
        },
        shared: {
          category: catStr,
          categories: JSON.stringify(catsArray),
          source: 'memotralci',
        },
      }
    }

    let res = await this.fetchWithAuth(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patchBody),
      }
    )

    let usedCalId = calId
    if (res.status === 404) {
      const candidates = await this.resolveRelevantCalendarIds()
      for (const altCalId of candidates) {
        if (altCalId === calId) continue
        const retryRes = await this.fetchWithAuth(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(altCalId)}/events/${encodeURIComponent(id)}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(patchBody),
          }
        )
        if (retryRes.ok) {
          res = retryRes
          usedCalId = altCalId
          break
        }
      }
    }

    if (!res.ok) {
      throw new Error(`Errore aggiornamento evento Google: ${res.statusText}`)
    }

    const item = await res.json()
    const isAllDay = Boolean(item.start?.date)
    const updatedEvent: AppCalendarEvent = {
      id: item.id,
      title: item.summary,
      description: item.description || '',
      location: item.location || '',
      start: isAllDay ? startDateOnly || item.start?.date : item.start?.dateTime || eventData.start || '',
      end: isAllDay ? inclusiveEndDateOnly || item.end?.date : item.end?.dateTime || eventData.end || '',
      allDay: isAllDay,
      category: catStr || undefined,
      categories: catsArray,
      attachments: eventData.attachments,
      googleEventId: item.id,
      calendarId: usedCalId,
    }

    this.rememberRecentEvent(updatedEvent)
    return updatedEvent
  }

  public async deleteCalendarEvent(id: string): Promise<boolean> {
    this.removeRecentEvent(id)
    const allLocal = await localDB.getAllEvents()
    const matched = allLocal.find((e) => e.id === id)
    const calId = matched?.calendarId || (await this.resolveCalendarId())

    const res = await this.fetchWithAuth(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      }
    )

    if (res.status === 404) {
      const candidates = await this.resolveRelevantCalendarIds()
      for (const altCalId of candidates) {
        if (altCalId === calId) continue
        const retryRes = await this.fetchWithAuth(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(altCalId)}/events/${encodeURIComponent(id)}`,
          {
            method: 'DELETE',
          }
        )
        if (retryRes.ok) return true
      }
    }

    return res.ok || res.status === 404
  }

  // ==========================================
  // GOOGLE DRIVE DIRECT INTEGRATION
  // ==========================================

  public async resolveDriveFolderId(): Promise<string> {
    if (this.cachedFolderId) return this.cachedFolderId
    if (GOOGLE_DEFAULTS.driveFolderId) {
      this.cachedFolderId = GOOGLE_DEFAULTS.driveFolderId
      localStorage.setItem(STORAGE_KEYS.FOLDER_ID, GOOGLE_DEFAULTS.driveFolderId)
      return GOOGLE_DEFAULTS.driveFolderId
    }

    try {
      const folderQuery = `name = '${GOOGLE_DEFAULTS.driveFolderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
      const res = await this.fetchWithAuth(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(folderQuery)}&fields=files(id,name)&pageSize=5`
      )

      if (res.ok) {
        const data = await res.json()
        const folder = data.files && data.files[0]
        if (folder?.id) {
          this.cachedFolderId = folder.id
          localStorage.setItem(STORAGE_KEYS.FOLDER_ID, folder.id)
          return folder.id
        }
      }

      // Se non esiste, crea la cartella su Drive
      const createRes = await this.fetchWithAuth('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: GOOGLE_DEFAULTS.driveFolderName,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      })

      if (createRes.ok) {
        const created = await createRes.json()
        if (created.id) {
          this.cachedFolderId = created.id
          localStorage.setItem(STORAGE_KEYS.FOLDER_ID, created.id)
          return created.id
        }
      }
    } catch (e) {
      console.warn('[Google Drive] Risoluzione cartella fallita:', e)
    }

    return GOOGLE_DEFAULTS.driveFolderId
  }

  private parseDriveAttachmentCategories(appProperties?: Record<string, string>): string[] {
    if (!appProperties?.memotralci_categories) return []
    try {
      const parsed = JSON.parse(appProperties.memotralci_categories)
      if (Array.isArray(parsed)) {
        return parsed.filter((c) => typeof c === 'string' && c.trim().length > 0)
      }
    } catch { }
    return []
  }

  public async uploadFile(file: File, categories: string[] = []): Promise<UploadedAttachment> {
    const folderId = await this.resolveDriveFolderId()

    // Preparazione multipart upload nativo
    const boundary = '-------MEMOTRALCI' + Math.random().toString(36).substring(2)
    const delimiter = `\r\n--${boundary}\r\n`
    const closeDelim = `\r\n--${boundary}--`

    const cleanCats = categories.filter((c) => c && c.trim().length > 0)
    const metadata: Record<string, any> = {
      name: file.name,
      parents: [folderId],
      mimeType: file.type || 'application/octet-stream',
    }
    if (cleanCats.length > 0) {
      metadata.appProperties = {
        memotralci_categories: JSON.stringify(cleanCats),
      }
    }

    const metadataPart = new Blob(
      [
        delimiter,
        'Content-Type: application/json; charset=UTF-8\r\n\r\n',
        JSON.stringify(metadata),
        delimiter,
        `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
      ],
      { type: 'text/plain' }
    )
    const endPart = new Blob([closeDelim], { type: 'text/plain' })
    const multipartBody = new Blob([metadataPart, file, endPart])

    const uploadRes = await this.fetchWithAuth(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink,createdTime,appProperties',
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      }
    )

    if (!uploadRes.ok) {
      throw new Error(`Upload su Google Drive fallito (${uploadRes.status}): ${uploadRes.statusText}`)
    }

    const uploaded = await uploadRes.json()

    // Rendiamo il file accessibile con link se necessario
    try {
      await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${uploaded.id}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
      })
    } catch { }

    const uploadedCats = this.parseDriveAttachmentCategories(uploaded.appProperties)
    const finalCats = uploadedCats.length > 0 ? uploadedCats : cleanCats

    return {
      id: uploaded.id,
      name: uploaded.name || file.name,
      mimeType: uploaded.mimeType || file.type,
      size: Number(uploaded.size || file.size),
      webViewLink: uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`,
      webContentLink: uploaded.webContentLink,
      createdTime: uploaded.createdTime || new Date().toISOString(),
      isLocal: false,
      categories: finalCats,
      category: finalCats.length > 0 ? finalCats.join(',') : undefined,
    }
  }

  public async updateDriveFileCategories(fileId: string, categories: string[]): Promise<void> {
    const cleanCats = categories.filter((c) => c && c.trim().length > 0)
    const res = await this.fetchWithAuth(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,appProperties`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appProperties: {
            memotralci_categories: JSON.stringify(cleanCats),
          },
        }),
      }
    )
    if (!res.ok) {
      throw new Error(`Errore aggiornamento categorie file Drive (${res.status}): ${res.statusText}`)
    }
  }

  public async listDriveFiles(): Promise<UploadedAttachment[]> {
    const folderId = await this.resolveDriveFolderId()
    const query = `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`

    const res = await this.fetchWithAuth(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        query
      )}&fields=files(id,name,mimeType,size,webViewLink,webContentLink,createdTime,appProperties)&pageSize=100&orderBy=createdTime%20desc`
    )

    if (!res.ok) return []

    const data = await res.json()
    const files: any[] = data.files || []

    // Filtra in modo rigoroso per mostrare SOLO gli allegati veri:
    // Esclude cartelle, file di sistema dei task e credenziali
    const realFiles = files.filter((f) => {
      if (!f || !f.name) return false
      if (f.mimeType === 'application/vnd.google-apps.folder') return false
      const n = f.name.toLowerCase()
      if (
        n === 'tasks.json' ||
        n === '_tasks_index.json' ||
        n === '_categories.json' ||
        n.includes('client secret') ||
        n.includes('service-account')
      ) {
        return false
      }
      if (n.startsWith('[') && n.endsWith('.json')) return false
      return true
    })

    return realFiles.map((f) => {
      const cats = this.parseDriveAttachmentCategories(f.appProperties)
      return {
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: Number(f.size || 0),
        webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
        webContentLink: f.webContentLink,
        createdTime: f.createdTime || new Date().toISOString(),
        isLocal: false,
        categories: cats,
        category: cats.length > 0 ? cats.join(',') : undefined,
      }
    })
  }

  // ==========================================
  // GOOGLE DRIVE TASK ARCHIVE INTEGRATION
  // (Sottocartella "Archivio_Task" dentro "allegati memotralci")
  // ==========================================

  public async resolveTaskArchiveFolderId(): Promise<string> {
    if (this.cachedTaskFolderId) return this.cachedTaskFolderId
    if (GOOGLE_DEFAULTS.taskArchiveFolderId) {
      this.cachedTaskFolderId = GOOGLE_DEFAULTS.taskArchiveFolderId
      localStorage.setItem(STORAGE_KEYS.TASK_FOLDER_ID, GOOGLE_DEFAULTS.taskArchiveFolderId)
      return GOOGLE_DEFAULTS.taskArchiveFolderId
    }

    const parentFolderId = await this.resolveDriveFolderId()
    const folderName = 'Archivio_Task'

    try {
      const q = `'${parentFolderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
      const searchRes = await this.fetchWithAuth(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=5`
      )

      if (searchRes.ok) {
        const data = await searchRes.json()
        const found = data.files && data.files[0]
        if (found?.id) {
          this.cachedTaskFolderId = found.id
          localStorage.setItem(STORAGE_KEYS.TASK_FOLDER_ID, found.id)
          return found.id
        }
      }

      // Se non esiste, crea la sottocartella dentro la cartella allegati
      const createRes = await this.fetchWithAuth('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId],
          description: 'Archivio delle attività MemoTralci organizzate per data e descrizione',
        }),
      })

      if (createRes.ok) {
        const created = await createRes.json()
        if (created?.id) {
          this.cachedTaskFolderId = created.id
          localStorage.setItem(STORAGE_KEYS.TASK_FOLDER_ID, created.id)
          return created.id
        }
      }
    } catch (e) {
      console.warn('[Google Drive Task Archive] Risoluzione sottocartella fallita:', e)
    }

    return parentFolderId
  }

  public getTaskFileName(task: AppTaskItem): string {
    const date =
      task.dueDate ||
      (task.createdAt ? task.createdAt.split('T')[0] : new Date().toISOString().split('T')[0])
    const cleanTitle = (task.title || 'Attivita')
      .replace(/[\\/:*?"<>|\r\n\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const cleanDesc = task.description
      ? task.description.replace(/[\\/:*?"<>|\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40)
      : ''
    const base = cleanDesc ? `${cleanTitle} - ${cleanDesc}` : cleanTitle
    const shortBase = base.slice(0, 70).trim()
    return `[${date}] ${shortBase}_${task.id}.json`
  }

  private async uploadOrUpdateJsonFile(
    folderId: string,
    fileName: string,
    data: any,
    description?: string,
    matchSuffix?: string
  ): Promise<string> {
    const contentStr = JSON.stringify(data, null, 2)
    const jsonBlob = new Blob([contentStr], { type: 'application/json' })

    // 1. Verifica se il file esiste già nella cartella (o globalmente per i file di indice/categorie)
    let existingFileId: string | null = null
    try {
      const q = matchSuffix
        ? `'${folderId}' in parents and trashed = false`
        : `'${folderId}' in parents and name = '${fileName.replace(/'/g, "\\'")}' and trashed = false`
      const searchRes = await this.fetchWithAuth(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=modifiedTime%20desc&fields=files(id,name)&pageSize=50`
      )
      if (searchRes.ok) {
        const searchData = await searchRes.json()
        const files: any[] = searchData.files || []
        const match = matchSuffix
          ? files.find((f) => f.name?.endsWith(matchSuffix))
          : files.find((f) => f.name === fileName)
        if (match?.id) existingFileId = match.id
      }

      // Fallback di ricerca globale se la cartella non era accessibile con drive.file
      if (!existingFileId && !matchSuffix) {
        const globalQ = `name = '${fileName.replace(/'/g, "\\'")}' and trashed = false`
        const globalRes = await this.fetchWithAuth(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(globalQ)}&orderBy=modifiedTime%20desc&fields=files(id,name)&pageSize=10`
        )
        if (globalRes.ok) {
          const globalData = await globalRes.json()
          const globalMatch = globalData.files?.[0]
          if (globalMatch?.id) existingFileId = globalMatch.id
        }
      }
    } catch { }

    const boundary = '-------MEMOTRALCI' + Math.random().toString(36).substring(2)
    const delimiter = `\r\n--${boundary}\r\n`
    const closeDelim = `\r\n--${boundary}--`

    if (existingFileId) {
      const metadata = { name: fileName, description }
      const metadataPart = new Blob(
        [
          delimiter,
          'Content-Type: application/json; charset=UTF-8\r\n\r\n',
          JSON.stringify(metadata),
          delimiter,
          'Content-Type: application/json\r\n\r\n',
        ],
        { type: 'text/plain' }
      )
      const endPart = new Blob([closeDelim], { type: 'text/plain' })
      const multipartBody = new Blob([metadataPart, jsonBlob, endPart])

      const res = await this.fetchWithAuth(
        `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartBody,
        }
      )
      if (res.ok) {
        const d = await res.json()
        return d.id
      }
    }

    // 2. Creazione nuovo file (tenta prima nella cartella, poi fallback senza parents se 404 per drive.file)
    const buildPostBody = (withParent: boolean) => {
      const metadata: any = {
        name: fileName,
        description,
        mimeType: 'application/json',
      }
      if (withParent && folderId) {
        metadata.parents = [folderId]
      }
      const metadataPart = new Blob(
        [
          delimiter,
          'Content-Type: application/json; charset=UTF-8\r\n\r\n',
          JSON.stringify(metadata),
          delimiter,
          'Content-Type: application/json\r\n\r\n',
        ],
        { type: 'text/plain' }
      )
      const endPart = new Blob([closeDelim], { type: 'text/plain' })
      return new Blob([metadataPart, jsonBlob, endPart])
    }

    const res = await this.fetchWithAuth(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: buildPostBody(true),
      }
    )
    if (res.ok) {
      const d = await res.json()
      return d.id
    }

    // Fallback automatico senza parent folder (necessario se la cartella è stata creata manualmente fuori da drive.file)
    const fallbackRes = await this.fetchWithAuth(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: buildPostBody(false),
      }
    )
    if (fallbackRes.ok) {
      const d = await fallbackRes.json()
      return d.id
    }

    return ''
  }

  public async getDriveTasks(): Promise<AppTaskItem[]> {
    try {
      const folderId = await this.resolveTaskArchiveFolderId()

      // 1. Prova prima a leggere l'indice _tasks_index.json (sia nella cartella sia globalmente per fallback drive.file)
      const indexQuery = `name = '_tasks_index.json' and trashed = false`
      const indexRes = await this.fetchWithAuth(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(indexQuery)}&orderBy=modifiedTime%20desc&fields=files(id,name)&pageSize=1`
      )

      if (indexRes.ok) {
        const indexData = await indexRes.json()
        const indexFile = indexData.files?.[0]
        if (indexFile?.id) {
          const contentRes = await this.fetchWithAuth(
            `https://www.googleapis.com/drive/v3/files/${indexFile.id}?alt=media`
          )
          if (contentRes.ok) {
            const tasks = await contentRes.json()
            if (Array.isArray(tasks)) {
              return tasks
            }
          }
        }
      }

      // 2. Se l'indice non c'è, leggi i singoli file task presenti nella sottocartella
      const filesQuery = `'${folderId}' in parents and trashed = false and mimeType = 'application/json' and name != '_tasks_index.json'`
      const filesRes = await this.fetchWithAuth(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(filesQuery)}&fields=files(id,name)&pageSize=100`
      )

      if (filesRes.ok) {
        const filesData = await filesRes.json()
        const files: any[] = filesData.files || []
        const loadedTasks: AppTaskItem[] = []

        for (const f of files) {
          try {
            const taskRes = await this.fetchWithAuth(
              `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`
            )
            if (taskRes.ok) {
              const t = await taskRes.json()
              if (t && t.id && t.title) {
                loadedTasks.push(t)
              }
            }
          } catch { }
        }

        if (loadedTasks.length > 0) {
          loadedTasks.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
          return loadedTasks
        }
      }
    } catch (e) {
      console.warn('[Google Drive Task Archive] Errore lettura task da Drive:', e)
    }

    return []
  }

  public async saveDriveTasks(tasks: AppTaskItem[]): Promise<void> {
    try {
      const folderId = await this.resolveTaskArchiveFolderId()

      // 1. Salva l'indice generale _tasks_index.json
      await this.uploadOrUpdateJsonFile(folderId, '_tasks_index.json', tasks, 'Indice generale delle cose da fare MemoTralci')

      // 2. Salva/aggiorna ogni singolo task come file archiviato [DATA] Descrizione_id.json
      for (const task of tasks) {
        const fileName = this.getTaskFileName(task)
        await this.uploadOrUpdateJsonFile(
          folderId,
          fileName,
          task,
          `Attività: ${task.title} - Scadenza: ${task.dueDate || 'Nessuna'}`,
          `_${task.id}.json`
        )
      }

      // 3. Elimina eventuali file remoti orfani di task eliminati
      const currentTaskIds = new Set(tasks.map((t) => t.id))
      const listRes = await this.fetchWithAuth(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          `'${folderId}' in parents and trashed = false and name != '_tasks_index.json'`
        )}&fields=files(id,name)&pageSize=100`
      )
      if (listRes.ok) {
        const listData = await listRes.json()
        const files: any[] = listData.files || []
        for (const f of files) {
          const match = f.name?.match(/_([^_]+)\.json$/)
          if (match && !currentTaskIds.has(match[1])) {
            try {
              await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
                method: 'DELETE',
              })
            } catch { }
          }
        }
      }
    } catch (e) {
      console.warn('[Google Drive Task Archive] Errore salvataggio task su Drive:', e)
    }
  }

  public async saveDriveTask(task: AppTaskItem, allTasks: AppTaskItem[]): Promise<void> {
    try {
      const folderId = await this.resolveTaskArchiveFolderId()
      const fileName = this.getTaskFileName(task)
      await this.uploadOrUpdateJsonFile(
        folderId,
        fileName,
        task,
        `Attività: ${task.title} - Scadenza: ${task.dueDate || 'Nessuna'}`,
        `_${task.id}.json`
      )
      // Aggiorna anche l'indice rapido
      await this.uploadOrUpdateJsonFile(folderId, '_tasks_index.json', allTasks, 'Indice generale delle cose da fare MemoTralci')
    } catch (e) {
      console.warn('[Google Drive Task Archive] Errore salvataggio singolo task:', e)
    }
  }

  public async deleteDriveTask(taskId: string, allTasks: AppTaskItem[]): Promise<boolean> {
    try {
      const folderId = await this.resolveTaskArchiveFolderId()
      // Elimina il file del task
      const searchRes = await this.fetchWithAuth(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          `'${folderId}' in parents and trashed = false`
        )}&fields=files(id,name)&pageSize=100`
      )
      if (searchRes.ok) {
        const data = await searchRes.json()
        const files: any[] = data.files || []
        const match = files.find((f) => f.name?.endsWith(`_${taskId}.json`))
        if (match?.id) {
          await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${match.id}`, {
            method: 'DELETE',
          })
        }
      }
      // Aggiorna indice
      await this.uploadOrUpdateJsonFile(folderId, '_tasks_index.json', allTasks, 'Indice generale delle cose da fare MemoTralci')
      return true
    } catch {
      return false
    }
  }

  /**
   * Elimina fisicamente un file da Google Drive (es. allegato eliminato da un task)
   */
  public async deleteDriveFile(fileId: string): Promise<boolean> {
    if (!fileId) return false
    try {
      const res = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
        method: 'DELETE',
      })
      return res.ok || res.status === 404
    } catch (e) {
      console.warn('[Google Drive] Errore cancellazione fisica file:', e)
      return false
    }
  }

  /**
   * Resetta la cache degli ID delle cartelle e del calendario (forzando ri-risoluzione pulita)
   */
  public clearCachedIds(): void {
    this.cachedCalendarId = null
    this.cachedFolderId = null
    this.cachedTaskFolderId = null
    try {
      localStorage.removeItem(STORAGE_KEYS.CALENDAR_ID)
      localStorage.removeItem(STORAGE_KEYS.FOLDER_ID)
      localStorage.removeItem(STORAGE_KEYS.TASK_FOLDER_ID)
    } catch { }
  }

  /**
   * Recupera il payload delle categorie sincronizzate dal Cloud (Google Drive _categories.json + Google Calendar Metadata Mirror)
   * Restituisce sempre la versione più recente (con updatedAt maggiore).
   */
  public async getDriveCategories(): Promise<CategoriesCloudPayload | null> {
    const candidates: CategoriesCloudPayload[] = []

    const normalizePayload = (raw: any): CategoriesCloudPayload | null => {
      if (!raw) return null
      if (Array.isArray(raw) && raw.length > 0) {
        return {
          version: 1,
          updatedAt: 0,
          categories: raw,
          deletedIds: [],
        }
      }
      if (raw && typeof raw === 'object' && Array.isArray(raw.categories)) {
        return {
          version: Number(raw.version || 2),
          updatedAt: Number(raw.updatedAt || 0),
          categories: raw.categories,
          deletedIds: Array.isArray(raw.deletedIds) ? raw.deletedIds : [],
          explicitReset: Boolean(raw.explicitReset),
        }
      }
      return null
    }

    // Canale 1: Google Drive (_categories.json cercato globalmente senza vincolo parent folder per compatibilità drive.file)
    const drivePromise = (async () => {
      try {
        const query = `name = '_categories.json' and trashed = false`
        const res = await this.fetchWithAuth(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=modifiedTime%20desc&fields=files(id,name,modifiedTime)&pageSize=5`
        )
        if (res.ok) {
          const data = await res.json()
          const files: any[] = data.files || []
          for (const file of files) {
            if (!file?.id) continue
            try {
              const contentRes = await this.fetchWithAuth(
                `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`
              )
              if (contentRes.ok) {
                const json = await contentRes.json()
                const parsed = normalizePayload(json)
                if (parsed) candidates.push(parsed)
              }
            } catch { }
          }
        }
      } catch (e) {
        console.warn('[Google Drive Categories] Errore lettura da Drive:', e)
      }
    })()

    // Canale 2: Google Calendar Metadata Mirror (100% condiviso tra tutti i dispositivi connessi al calendario Segreteria)
    const calendarPromise = (async () => {
      try {
        const calId = await this.resolveCalendarId()
        const calRes = await this.fetchWithAuth(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}`
        )
        if (calRes.ok) {
          const calData = await calRes.json()
          const desc: string = calData.description || ''
          const match = desc.match(/\[MEMOTRALCI_CATS_V2:(.+?)\]/s)
          if (match?.[1]) {
            const rawJson = JSON.parse(match[1])
            const parsed = normalizePayload(rawJson)
            if (parsed) candidates.push(parsed)
          }
        }
      } catch (e) {
        console.warn('[Google Calendar Categories Mirror] Errore lettura metadati calendario:', e)
      }
    })()

    await Promise.allSettled([drivePromise, calendarPromise])

    if (candidates.length === 0) return null
    candidates.sort((a, b) => b.updatedAt - a.updatedAt)
    return candidates[0]
  }

  /**
   * Salva o aggiorna le categorie nel cloud sia su Google Drive (_categories.json) sia nei metadati del Calendario condiviso
   */
  public async saveDriveCategories(payload: CategoriesCloudPayload): Promise<void> {
    // 1. Salva su Google Drive (_categories.json con fallback automatico se la cartella non è scrivibile con drive.file)
    const drivePromise = (async () => {
      try {
        const folderId = await this.resolveDriveFolderId()
        await this.uploadOrUpdateJsonFile(
          folderId,
          '_categories.json',
          payload,
          'Categorie personalizzate MemoTralci (sincronizzate multi-dispositivo v2)'
        )
      } catch (e) {
        console.warn('[Google Drive Categories] Errore salvataggio categorie su Drive:', e)
      }
    })()

    // 2. Salva mirror nei metadati del calendario Google condiviso ("Segreteria")
    const calendarPromise = (async () => {
      try {
        const calId = await this.resolveCalendarId()
        const calRes = await this.fetchWithAuth(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}`
        )
        let baseDesc = ''
        if (calRes.ok) {
          const calData = await calRes.json()
          baseDesc = (calData.description || '').replace(/\s*\[MEMOTRALCI_CATS_V2:.+?\]/s, '').trim()
        }
        const tag = `[MEMOTRALCI_CATS_V2:${JSON.stringify(payload)}]`
        const newDesc = baseDesc ? `${baseDesc}\n\n${tag}` : tag

        await this.fetchWithAuth(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: newDesc }),
          }
        )
      } catch (e) {
        console.warn('[Google Calendar Categories Mirror] Errore salvataggio metadati calendario:', e)
      }
    })()

    await Promise.allSettled([drivePromise, calendarPromise])
  }
}

export const googleClientSide = new GoogleClientSide()

