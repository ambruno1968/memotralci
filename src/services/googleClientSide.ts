// src/services/googleClientSide.ts
// Modulo client-side autonomo per Google Identity Services (GIS), Google Calendar v3 e Google Drive v3
// Funziona al 100% nel browser (GitHub Pages PWA o localhost) senza dipendere da backend

import type { AppCalendarEvent } from '../types/event.ts'
import type { UploadedAttachment } from '../types/attachment.ts'

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
  driveFolderName: 'allegati memotralci',
  driveFolderId: '1HMcovycbLn9TKAXs1CmrcSylcDZj0GXc',
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
}

class GoogleClientSide {
  private gisPromise: Promise<void> | null = null
  private cachedCalendarId: string | null = null
  private cachedFolderId: string | null = null

  constructor() {
    this.cachedCalendarId = localStorage.getItem(STORAGE_KEYS.CALENDAR_ID)
    this.cachedFolderId = localStorage.getItem(STORAGE_KEYS.FOLDER_ID)
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

  // Verifica se è presente un token salvato valido
  public isConnected(): boolean {
    const token = this.getToken()
    return Boolean(token && token.trim().length > 10)
  }

  public getToken(): string | null {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
      const exp = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES)
      if (exp && Date.now() > Number(exp)) {
        // Token scaduto
        this.clearToken()
        return null
      }
      return token
    } catch {
      return null
    }
  }

  public setToken(token: string, expiresInSeconds: number = 3600) {
    try {
      localStorage.setItem(STORAGE_KEYS.TOKEN, token.trim())
      const expTime = Date.now() + (expiresInSeconds - 60) * 1000
      localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES, String(expTime))
    } catch (e) {
      console.warn('Errore salvataggio token:', e)
    }
  }

  public clearToken() {
    try {
      localStorage.removeItem(STORAGE_KEYS.TOKEN)
      localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES)
      localStorage.removeItem(STORAGE_KEYS.USER)
      this.cachedCalendarId = null
      this.cachedFolderId = null
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

  // Richiesta Token OAuth via GIS Popup
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

    const token = this.getToken()
    if (!token) return 'primary'

    try {
      const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=100', {
        headers: { Authorization: `Bearer ${token}` },
      })

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
    const token = this.getToken()
    if (!token) return []

    const calId = await this.resolveCalendarId()
    const timeMin = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    const timeMax = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calId
    )}/events?maxResults=250&singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(
      timeMin
    )}&timeMax=${encodeURIComponent(timeMax)}`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      if (res.status === 401) {
        this.clearToken()
      }
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

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
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
    const token = this.getToken()
    if (!token) throw new Error('Account Google non connesso')

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

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
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
    const token = this.getToken()
    if (!token) return true

    const calId = await this.resolveCalendarId()
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    return res.ok || res.status === 404
  }

  // ==========================================
  // GOOGLE DRIVE DIRECT INTEGRATION
  // ==========================================

  public async resolveDriveFolderId(): Promise<string> {
    if (this.cachedFolderId) return this.cachedFolderId

    const token = this.getToken()
    if (!token) return GOOGLE_DEFAULTS.driveFolderId

    try {
      const folderQuery = `name = '${GOOGLE_DEFAULTS.driveFolderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(folderQuery)}&fields=files(id,name)&pageSize=5`,
        { headers: { Authorization: `Bearer ${token}` } }
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
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
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
    const token = this.getToken()
    if (!token) throw new Error('Account Google non connesso')

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

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink,createdTime',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
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
      await fetch(`https://www.googleapis.com/drive/v3/files/${uploaded.id}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
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
    const token = this.getToken()
    if (!token) return []

    const folderId = await this.resolveDriveFolderId()
    const query = `'${folderId}' in parents and trashed = false`

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        query
      )}&fields=files(id,name,mimeType,size,webViewLink,webContentLink,createdTime)&pageSize=100&orderBy=createdTime%20desc`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (!res.ok) return []

    const data = await res.json()
    const files: any[] = data.files || []

    return files.map((f) => ({
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
}

export const googleClientSide = new GoogleClientSide()
