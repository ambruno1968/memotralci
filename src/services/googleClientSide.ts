// src/services/googleClientSide.ts
// Modulo client-side autonomo per Google Identity Services (GIS), Google Calendar v3 e Google Drive v3
// Funziona al 100% nel browser (GitHub Pages PWA o localhost) senza dipendere da backend

import type { AppCalendarEvent } from '../types/event.ts'
import type { UploadedAttachment } from '../types/attachment.ts'
import type { AppTaskItem } from '../types/task.ts'

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
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid',
  ].join(' '),
}

const STORAGE_KEYS = {
  TOKEN: 'memotralci_google_token',
  TOKEN_EXPIRES: 'memotralci_google_token_exp',
  USER: 'memotralci_google_user',
  CALENDAR_ID: 'memotralci_resolved_cal_id',
  FOLDER_ID: 'memotralci_resolved_folder_id',
  TASK_FOLDER_ID: 'memotralci_task_folder_id',
}

class GoogleClientSide {
  private gisPromise: Promise<void> | null = null
  private cachedCalendarId: string | null = null
  private cachedFolderId: string | null = null
  private cachedTaskFolderId: string | null = null
  private refreshTimer: any = null
  private refreshPromise: Promise<string | null> | null = null

  constructor() {
    this.cachedCalendarId = localStorage.getItem(STORAGE_KEYS.CALENDAR_ID)
    this.cachedFolderId = localStorage.getItem(STORAGE_KEYS.FOLDER_ID)
    this.cachedTaskFolderId = localStorage.getItem(STORAGE_KEYS.TASK_FOLDER_ID)

    this.setupLifecycleListeners()
    this.scheduleAutoRefresh()
  }

  // Monitora visibilità pagina e focus per rinnovare automaticamente il token
  private setupLifecycleListeners() {
    if (typeof window === 'undefined') return

    const checkAndRefresh = () => {
      const exp = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES)
      const user = this.getUserInfo()
      if (user && exp) {
        const timeUntilExp = Number(exp) - Date.now()
        // Se mancano meno di 10 minuti o è già scaduto, rinnova silenziosamente
        if (timeUntilExp < 10 * 60 * 1000) {
          this.silentRefreshToken().catch(() => {})
        }
      }
    }

    window.addEventListener('focus', checkAndRefresh)
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

  // Verifica se è presente un token o una sessione salvata valida
  public isConnected(): boolean {
    const token = this.getToken()
    if (token && token.trim().length > 10) return true

    // Se abbiamo l'utente memorizzato ma il token è in fase di scadenza, la sessione è attiva
    const user = this.getUserInfo()
    if (user && user.email) {
      this.silentRefreshToken().catch(() => {})
      return true
    }
    return false
  }

  public getToken(): string | null {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
      const exp = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES)
      if (exp) {
        const expNum = Number(exp)
        // Se mancano meno di 5 minuti, avvia il rinnovo in background
        if (Date.now() > expNum - 5 * 60 * 1000) {
          this.silentRefreshToken().catch(() => {})
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

    // Se scaduto, tenta il rinnovo silenzioso immediato
    const user = this.getUserInfo()
    if (user) {
      return await this.silentRefreshToken()
    }
    return null
  }

  public setToken(token: string, expiresInSeconds: number = 3600) {
    try {
      localStorage.setItem(STORAGE_KEYS.TOKEN, token.trim())
      // Scadenza calcolata con margine di sicurezza
      const expTime = Date.now() + Math.max(300, expiresInSeconds - 60) * 1000
      localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES, String(expTime))
      this.scheduleAutoRefresh(expiresInSeconds)
    } catch (e) {
      console.warn('Errore salvataggio token:', e)
    }
  }

  // Programma il rinnovo automatico circa 5 minuti prima della scadenza
  public scheduleAutoRefresh(expiresInSeconds?: number) {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }

    let delayMs = 50 * 60 * 1000 // Default 50 minuti
    if (expiresInSeconds && expiresInSeconds > 600) {
      delayMs = (expiresInSeconds - 300) * 1000
    } else {
      const exp = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES)
      if (exp) {
        delayMs = Math.max(30000, Number(exp) - Date.now() - 300000)
      }
    }

    this.refreshTimer = setTimeout(() => {
      this.silentRefreshToken().catch((err) => {
        console.warn('[Google GIS] Rinnovo schedulato fallito:', err)
      })
    }, delayMs)
  }

  public clearToken() {
    try {
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer)
        this.refreshTimer = null
      }
      localStorage.removeItem(STORAGE_KEYS.TOKEN)
      localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES)
      localStorage.removeItem(STORAGE_KEYS.USER)
      localStorage.removeItem(STORAGE_KEYS.TASK_FOLDER_ID)
      this.cachedCalendarId = null
      this.cachedFolderId = null
      this.cachedTaskFolderId = null
    } catch {}
  }

  public getUserInfo(): GoogleUserInfo | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  }

  // Rinnovo Silenzioso del Token in Background senza popup e senza interruzioni
  public async silentRefreshToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise

    this.refreshPromise = (async () => {
      try {
        await this.loadGis()
        const user = this.getUserInfo()
        const oauth2 = (window as any).google?.accounts?.oauth2
        if (!oauth2) return null

        return await new Promise<string | null>((resolve) => {
          let resolved = false
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true
              console.warn('[Google GIS] Timeout rinnovo silenzioso token')
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
                  console.info('[Google GIS] Token rinnovato con successo in background!')
                  resolve(token)
                } else {
                  console.warn('[Google GIS] Risposta rinnovo silenzioso non valida:', resp)
                  resolve(null)
                }
              },
              error_callback: (err: any) => {
                if (resolved) return
                resolved = true
                clearTimeout(timeout)
                console.warn('[Google GIS] Errore silent refresh:', err)
                resolve(null)
              },
            })

            // Richiesta silenziosa senza prompt all'utente
            client.requestAccessToken({
              prompt: '',
              hint: user?.email || GOOGLE_DEFAULTS.calendarEmail,
            })
          } catch (e) {
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

  // Esegue fetch verso le API Google gestendo automaticamente il rinnovo del token su 401
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

    // Se riceviamo 401 Unauthorized, tenta il rinnovo immediato del token e riprova una volta
    if (res.status === 401) {
      console.info('[Google API] Ricevuto 401, tentativo di rinnovo immediato del token...')
      const refreshed = await this.silentRefreshToken()
      if (refreshed) {
        headers.set('Authorization', `Bearer ${refreshed}`)
        res = await fetch(url, { ...init, headers })
      } else {
        console.warn('[Google API] Impossibile rinnovare il token. Sessione scaduta.')
        this.clearToken()
      }
    }

    return res
  }

  // Richiesta Token OAuth via GIS Popup (primo accesso o ri-login esplicito)
  public async signIn(): Promise<{ token: string; user: GoogleUserInfo }> {
    await this.loadGis()

    return new Promise((resolve, reject) => {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_DEFAULTS.clientId,
          scope: GOOGLE_DEFAULTS.scopes,
          callback: async (resp: any) => {
            if (resp && resp.access_token) {
              const token = resp.access_token
              const expiresIn = resp.expires_in ? Number(resp.expires_in) : 3600
              this.setToken(token, expiresIn)

              // Fetch User Profile
              let user: GoogleUserInfo = { email: GOOGLE_DEFAULTS.calendarEmail, name: 'Segreteria' }
              try {
                const uRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                  headers: { Authorization: `Bearer ${token}` },
                })
                if (uRes.ok) {
                  user = await uRes.json()
                  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
                }
              } catch (e) {
                console.warn('Recupero info utente Google fallito:', e)
              }

              // Pre-risolvi calendario e cartella drive
              try {
                await this.resolveCalendarId()
                await this.resolveDriveFolderId()
              } catch {}

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
  // GOOGLE CALENDAR DIRECT INTEGRATION
  // ==========================================

  public async resolveCalendarId(): Promise<string> {
    if (this.cachedCalendarId) return this.cachedCalendarId

    try {
      const res = await this.fetchWithAuth('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=100')

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
          return found.id
        }
      }
    } catch (e) {
      console.warn('[Google Calendar] Risoluzione id calendario fallita:', e)
    }

    return 'primary'
  }

  public async getCalendarEvents(): Promise<AppCalendarEvent[]> {
    const calId = await this.resolveCalendarId()
    const timeMin = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    const timeMax = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calId
    )}/events?maxResults=250&singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(
      timeMin
    )}&timeMax=${encodeURIComponent(timeMax)}`

    const res = await this.fetchWithAuth(url)

    if (!res.ok) {
      throw new Error(`Errore Calendar Google (${res.status}): ${res.statusText}`)
    }

    const data = await res.json()
    const items: any[] = data.items || []

    return items.map((item) => {
      const isAllDay = Boolean(item.start?.date)
      const start = (isAllDay ? item.start?.date : item.start?.dateTime) || new Date().toISOString()
      const end = (isAllDay ? item.end?.date : item.end?.dateTime) || start

      let category: any = 'altro'
      let attachments: any[] = []

      if (item.extendedProperties?.private) {
        category = item.extendedProperties.private.category || 'altro'
        if (item.extendedProperties.private.attachments) {
          try {
            attachments = JSON.parse(item.extendedProperties.private.attachments)
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
        attachments,
        googleEventId: item.id,
      }
    })
  }

  public async createCalendarEvent(eventData: Omit<AppCalendarEvent, 'id'>): Promise<AppCalendarEvent> {
    const token = this.getToken()
    if (!token) throw new Error('Account Google non connesso')

    const calId = await this.resolveCalendarId()

    const startProp = eventData.allDay
      ? { date: eventData.start.split('T')[0] }
      : { dateTime: new Date(eventData.start).toISOString() }
    const endProp = eventData.allDay
      ? { date: eventData.end.split('T')[0] }
      : { dateTime: new Date(eventData.end).toISOString() }

    const body = {
      summary: eventData.title,
      description: eventData.description,
      location: eventData.location,
      start: startProp,
      end: endProp,
      extendedProperties: {
        private: {
          category: eventData.category || 'altro',
          attachments: JSON.stringify(eventData.attachments || []),
          source: 'memotralci',
        },
      },
    }

    const res = await this.fetchWithAuth(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`Errore creazione evento Google Calendar: ${res.statusText}`)
    }

    const item = await res.json()
    return {
      id: item.id,
      title: item.summary || eventData.title,
      description: item.description || eventData.description,
      location: item.location || eventData.location,
      start: eventData.start,
      end: eventData.end,
      allDay: eventData.allDay,
      category: eventData.category,
      attachments: eventData.attachments,
      googleEventId: item.id,
    }
  }

  public async updateCalendarEvent(id: string, eventData: Partial<AppCalendarEvent>): Promise<AppCalendarEvent> {
    const calId = await this.resolveCalendarId()

    const patchBody: any = {}
    if (eventData.title !== undefined) patchBody.summary = eventData.title
    if (eventData.description !== undefined) patchBody.description = eventData.description
    if (eventData.location !== undefined) patchBody.location = eventData.location

    if (eventData.start !== undefined || eventData.allDay !== undefined) {
      patchBody.start = eventData.allDay
        ? { date: (eventData.start || '').split('T')[0] }
        : { dateTime: new Date(eventData.start || new Date()).toISOString() }
    }
    if (eventData.end !== undefined || eventData.allDay !== undefined) {
      patchBody.end = eventData.allDay
        ? { date: (eventData.end || '').split('T')[0] }
        : { dateTime: new Date(eventData.end || new Date()).toISOString() }
    }

    if (eventData.category !== undefined || eventData.attachments !== undefined) {
      patchBody.extendedProperties = {
        private: {
          category: eventData.category || 'altro',
          attachments: JSON.stringify(eventData.attachments || []),
          source: 'memotralci',
        },
      }
    }

    const res = await this.fetchWithAuth(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patchBody),
      }
    )

    if (!res.ok) {
      throw new Error(`Errore aggiornamento evento Google: ${res.statusText}`)
    }

    const item = await res.json()
    return {
      id: item.id,
      title: item.summary,
      description: item.description || '',
      location: item.location || '',
      start: (eventData.allDay ? item.start?.date : item.start?.dateTime) || eventData.start || '',
      end: (eventData.allDay ? item.end?.date : item.end?.dateTime) || eventData.end || '',
      allDay: Boolean(item.start?.date),
      category: eventData.category,
      attachments: eventData.attachments,
      googleEventId: item.id,
    }
  }

  public async deleteCalendarEvent(id: string): Promise<boolean> {
    const calId = await this.resolveCalendarId()
    const res = await this.fetchWithAuth(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      }
    )

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

  public async uploadFile(file: File): Promise<UploadedAttachment> {
    const folderId = await this.resolveDriveFolderId()

    // Preparazione multipart upload nativo
    const boundary = '-------MEMOTRALCI' + Math.random().toString(36).substring(2)
    const delimiter = `\r\n--${boundary}\r\n`
    const closeDelim = `\r\n--${boundary}--`

    const metadata = {
      name: file.name,
      parents: [folderId],
      mimeType: file.type || 'application/octet-stream',
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
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink,createdTime',
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
    } catch {}

    return {
      id: uploaded.id,
      name: uploaded.name || file.name,
      mimeType: uploaded.mimeType || file.type,
      size: Number(uploaded.size || file.size),
      webViewLink: uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`,
      webContentLink: uploaded.webContentLink,
      createdTime: uploaded.createdTime || new Date().toISOString(),
      isLocal: false,
    }
  }

  public async listDriveFiles(): Promise<UploadedAttachment[]> {
    const folderId = await this.resolveDriveFolderId()
    const query = `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`

    const res = await this.fetchWithAuth(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        query
      )}&fields=files(id,name,mimeType,size,webViewLink,webContentLink,createdTime)&pageSize=100&orderBy=createdTime%20desc`
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
        n.includes('client secret') ||
        n.includes('service-account')
      ) {
        return false
      }
      if (n.startsWith('[') && n.endsWith('.json')) return false
      return true
    })

    return realFiles.map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: Number(f.size || 0),
      webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
      webContentLink: f.webContentLink,
      createdTime: f.createdTime || new Date().toISOString(),
      isLocal: false,
    }))
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

    // Verifica se il file esiste già nella cartella
    let existingFileId: string | null = null
    try {
      const q = matchSuffix
        ? `'${folderId}' in parents and trashed = false`
        : `'${folderId}' in parents and name = '${fileName.replace(/'/g, "\\'")}' and trashed = false`
      const searchRes = await this.fetchWithAuth(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=100`
      )
      if (searchRes.ok) {
        const searchData = await searchRes.json()
        const files: any[] = searchData.files || []
        const match = matchSuffix
          ? files.find((f) => f.name?.endsWith(matchSuffix))
          : files.find((f) => f.name === fileName)
        if (match?.id) existingFileId = match.id
      }
    } catch {}

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
    } else {
      const metadata = {
        name: fileName,
        parents: [folderId],
        description,
        mimeType: 'application/json',
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
      const multipartBody = new Blob([metadataPart, jsonBlob, endPart])

      const res = await this.fetchWithAuth(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
        {
          method: 'POST',
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
    return ''
  }

  public async getDriveTasks(): Promise<AppTaskItem[]> {
    try {
      const folderId = await this.resolveTaskArchiveFolderId()

      // 1. Prova prima a leggere l'indice _tasks_index.json
      const indexQuery = `'${folderId}' in parents and name = '_tasks_index.json' and trashed = false`
      const indexRes = await this.fetchWithAuth(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(indexQuery)}&fields=files(id,name)&pageSize=1`
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
          } catch {}
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
            } catch {}
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
}

export const googleClientSide = new GoogleClientSide()

