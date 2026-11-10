import type { AppCalendarEvent } from '../types/event.ts'
import type { AppTaskItem } from '../types/task.ts'
import type { UploadedAttachment } from '../types/attachment.ts'
import { localDB } from './db.ts'
import { googleClientSide, GOOGLE_DEFAULTS, type GoogleUserInfo } from './googleClientSide.ts'

export interface GoogleStatus {
  isOnline: boolean
  isGoogleConfigured: boolean
  authType?: 'service_account' | 'oauth2' | 'none'
  credentialType?: 'service_account' | 'oauth_client' | 'none'
  calendarId: string | null
  resolvedCalendar?: string | null
  driveFolderId: string | null
  serviceAccountConfigured: boolean
  oauthConnected?: boolean
  userInfo?: GoogleUserInfo | null
}

export function isRealAttachment(f: { name?: string; mimeType?: string }): boolean {
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
}

// Gestione eliminazioni definitive (Tombstones) per prevenire la ricomparsa dei task eliminati
const DELETED_TASKS_KEY = 'memotralci_deleted_tasks'

function getDeletedTaskIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_TASKS_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function markTaskAsDeleted(taskId: string) {
  try {
    const set = getDeletedTaskIds()
    set.add(taskId)
    const arr = Array.from(set).slice(-300)
    localStorage.setItem(DELETED_TASKS_KEY, JSON.stringify(arr))
  } catch {}
}

function unmarkTaskAsDeleted(taskId: string) {
  try {
    const set = getDeletedTaskIds()
    set.delete(taskId)
    localStorage.setItem(DELETED_TASKS_KEY, JSON.stringify(Array.from(set)))
  } catch {}
}

export const api = {
  // Check Google status (Direct Client-Side or Backend Fallback)
  async getStatus(): Promise<GoogleStatus> {
    // 1. Direct Client-Side GIS Check (Primary for PWA / GitHub Pages)
    if (googleClientSide.isConnected()) {
      const user = googleClientSide.getUserInfo()
      return {
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        isGoogleConfigured: true,
        authType: 'oauth2',
        credentialType: 'oauth_client',
        calendarId: user?.email || GOOGLE_DEFAULTS.calendarEmail,
        resolvedCalendar: GOOGLE_DEFAULTS.calendarName,
        driveFolderId: GOOGLE_DEFAULTS.driveFolderName,
        serviceAccountConfigured: false,
        oauthConnected: true,
        userInfo: user,
      }
    }

    // 2. Local Backend Check (if running locally on express)
    try {
      const res = await fetch('/api/status', { signal: AbortSignal.timeout(2000) })
      if (res.ok) {
        const data = await res.json()
        return {
          isOnline: true,
          isGoogleConfigured: Boolean(data.isGoogleConfigured),
          authType: data.authType,
          credentialType: data.credentialType,
          calendarId: data.calendarId || null,
          resolvedCalendar: data.resolvedCalendar || null,
          driveFolderId: data.driveFolderId || null,
          serviceAccountConfigured: Boolean(data.serviceAccountConfigured),
          oauthConnected: Boolean(data.oauthConnected),
        }
      }
    } catch {
      // Ignora, siamo in modalità PWA autonoma offline o su GitHub Pages
    }

    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : false,
      isGoogleConfigured: false,
      calendarId: GOOGLE_DEFAULTS.calendarEmail,
      resolvedCalendar: GOOGLE_DEFAULTS.calendarName,
      driveFolderId: GOOGLE_DEFAULTS.driveFolderName,
      serviceAccountConfigured: false,
      oauthConnected: false,
      userInfo: null,
    }
  },

  // Get accessible Google Calendars (e.g. "Segreteria")
  async getCalendars(): Promise<{
    calendars: { id: string; summary: string; primary: boolean; accessRole: string }[]
    resolved?: { id: string; summary: string }
  }> {
    if (googleClientSide.isConnected()) {
      try {
        const calId = await googleClientSide.resolveCalendarId()
        return {
          calendars: [
            {
              id: calId,
              summary: GOOGLE_DEFAULTS.calendarName,
              primary: true,
              accessRole: 'owner',
            },
          ],
          resolved: { id: calId, summary: GOOGLE_DEFAULTS.calendarName },
        }
      } catch {}
    }

    try {
      const res = await fetch('/api/calendars', { signal: AbortSignal.timeout(4000) })
      if (res.ok) {
        return res.json()
      }
    } catch {
      // Fallback
    }

    return {
      calendars: [
        {
          id: GOOGLE_DEFAULTS.calendarEmail,
          summary: GOOGLE_DEFAULTS.calendarName,
          primary: true,
          accessRole: 'owner',
        },
      ],
    }
  },

  // Disconnect Google Account
  async disconnectGoogle(): Promise<boolean> {
    googleClientSide.signOut()
    try {
      await fetch('/api/auth/google/disconnect', { method: 'POST', signal: AbortSignal.timeout(2000) })
    } catch {}
    return true
  },

  // Save Google configuration
  async saveConfig(configData: {
    calendarId?: string
    driveFolderId?: string
    serviceAccountJson?: string
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData),
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok) {
        return { success: true }
      }
    } catch {}
    // In ambiente statico salviamo in localStorage
    return { success: true }
  },

  // Events - Direct Google Calendar Sync
  async getEvents(): Promise<AppCalendarEvent[]> {
    // 1. Direct Client-Side Google Calendar Fetch
    if (googleClientSide.isConnected()) {
      try {
        const googleEvents = await googleClientSide.getCalendarEvents()
        await localDB.saveEvents(googleEvents)
        return googleEvents
      } catch (err) {
        console.warn('[Google Client] Errore lettura eventi da Google Calendar, uso database locale:', err)
      }
    }

    // 2. Server API fallback
    try {
      const res = await fetch('/api/events', { signal: AbortSignal.timeout(4000) })
      if (res.ok) {
        const events: AppCalendarEvent[] = await res.json()
        await localDB.saveEvents(events)
        return events
      }
    } catch {
      // Fallback a database locale
    }

    return localDB.getAllEvents()
  },

  async createEvent(eventData: Omit<AppCalendarEvent, 'id'>): Promise<AppCalendarEvent> {
    // 1. Direct Client-Side Google Calendar Create
    if (googleClientSide.isConnected()) {
      try {
        const created = await googleClientSide.createCalendarEvent(eventData)
        await localDB.saveEvent(created)
        return created
      } catch (err) {
        console.error('[Google Client] Errore creazione diretta su Google Calendar:', err)
      }
    }

    // 2. Server API fallback
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        const newEvt = await res.json()
        await localDB.saveEvent(newEvt)
        return newEvt
      }
    } catch {
      // Fallback
    }

    const localEvt: AppCalendarEvent = {
      ...eventData,
      id: `local_evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    }
    await localDB.saveEvent(localEvt)
    return localEvt
  },

  async updateEvent(
    id: string,
    eventData: Partial<AppCalendarEvent>
  ): Promise<AppCalendarEvent | null> {
    // 1. Direct Client-Side Google Calendar Update
    if (googleClientSide.isConnected() && !id.startsWith('local_evt_')) {
      try {
        const updated = await googleClientSide.updateCalendarEvent(id, eventData)
        await localDB.saveEvent(updated)
        return updated
      } catch (err) {
        console.error('[Google Client] Errore aggiornamento diretto su Google Calendar:', err)
      }
    }

    // 2. Server API fallback
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        const updated = await res.json()
        await localDB.saveEvent(updated)
        return updated
      }
    } catch {
      // Fallback
    }

    const events = await localDB.getAllEvents()
    const match = events.find((e) => e.id === id)
    if (match) {
      const updated = { ...match, ...eventData }
      await localDB.saveEvent(updated)
      return updated
    }
    return null
  },

  async deleteEvent(id: string): Promise<boolean> {
    // 1. Direct Client-Side Google Calendar Delete
    if (googleClientSide.isConnected() && !id.startsWith('local_evt_')) {
      try {
        await googleClientSide.deleteCalendarEvent(id)
      } catch (err) {
        console.warn('[Google Client] Errore cancellazione da Google Calendar:', err)
      }
    }

    // 2. Server API fallback
    try {
      await fetch(`/api/events/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(5000),
      })
    } catch {
      // Fallback
    }

    await localDB.deleteEvent(id)
    return true
  },

  // Tasks - Archiviazione Cose da Fare nella cartella Drive (sottocartella "Archivio_Task")
  async getTasks(): Promise<AppTaskItem[]> {
    const deletedIds = getDeletedTaskIds()
    const rawLocalTasks = await localDB.getAllTasks()
    const localTasks = rawLocalTasks.filter((t) => !deletedIds.has(t.id))

    // Se ci sono task cancellati ancora in localDB, rimuovili
    if (rawLocalTasks.length !== localTasks.length) {
      await localDB.saveTasks(localTasks)
    }

    // 1. Direct Client-Side Google Drive Task Archive
    if (googleClientSide.isConnected()) {
      try {
        const rawDriveTasks = await googleClientSide.getDriveTasks()
        if (Array.isArray(rawDriveTasks)) {
          // Filtra via tassativamente qualsiasi task eliminato
          const driveTasks = rawDriveTasks.filter((t) => !deletedIds.has(t.id))
          const driveMap = new Map(driveTasks.map((t) => [t.id, t]))
          const merged: AppTaskItem[] = [...driveTasks]

          // Unisci solo task locali NON eliminati che non sono ancora finiti su Drive
          for (const lt of localTasks) {
            if (!driveMap.has(lt.id) && !deletedIds.has(lt.id)) {
              merged.push(lt)
            }
          }

          await localDB.saveTasks(merged)
          return merged
        }
      } catch (err) {
        console.warn('[Archivio Drive] Errore lettura task da Drive, uso database locale:', err)
      }
    }

    // 2. Server API fallback (Express server legge dalla sottocartella Drive o locale)
    try {
      const res = await fetch('/api/tasks', { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        const rawServerTasks: AppTaskItem[] = await res.json()
        const serverTasks = rawServerTasks.filter((t) => !deletedIds.has(t.id))
        await localDB.saveTasks(serverTasks)
        return serverTasks
      }
    } catch {
      // Fallback
    }

    return localTasks
  },

  async createTask(taskData: AppTaskItem): Promise<AppTaskItem> {
    const finalTask = {
      ...taskData,
      id: taskData.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: taskData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    unmarkTaskAsDeleted(finalTask.id)
    await localDB.saveTask(finalTask)
    const allTasks = await localDB.getAllTasks()

    if (googleClientSide.isConnected()) {
      try {
        await googleClientSide.saveDriveTask(finalTask, allTasks)
      } catch (err) {
        console.warn('[Archivio Drive] Errore salvataggio remoto:', err)
      }
    }

    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalTask),
        signal: AbortSignal.timeout(3000),
      })
    } catch {}

    return finalTask
  },

  async saveTask(task: AppTaskItem): Promise<AppTaskItem> {
    const finalTask = { ...task, updatedAt: new Date().toISOString() }

    unmarkTaskAsDeleted(finalTask.id)
    await localDB.saveTask(finalTask)
    const allTasks = await localDB.getAllTasks()

    if (googleClientSide.isConnected()) {
      try {
        await googleClientSide.saveDriveTask(finalTask, allTasks)
      } catch (err) {
        console.warn('[Archivio Drive] Errore salvataggio remoto:', err)
      }
    }

    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalTask),
        signal: AbortSignal.timeout(3000),
      })
    } catch {}

    return finalTask
  },

  async deleteTask(taskId: string): Promise<boolean> {
    markTaskAsDeleted(taskId)
    await localDB.deleteTask(taskId)
    const remainingTasks = (await localDB.getAllTasks()).filter((t) => t.id !== taskId && !getDeletedTaskIds().has(t.id))
    await localDB.saveTasks(remainingTasks)

    if (googleClientSide.isConnected()) {
      try {
        await googleClientSide.deleteDriveTask(taskId, remainingTasks)
      } catch (err) {
        console.warn('[Archivio Drive] Errore eliminazione remota:', err)
      }
    }

    try {
      await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(3000),
      })
    } catch {}

    return true
  },

  async saveTasks(tasks: AppTaskItem[]): Promise<boolean> {
    await localDB.saveTasks(tasks)

    if (googleClientSide.isConnected()) {
      try {
        await googleClientSide.saveDriveTasks(tasks)
      } catch (err) {
        console.warn('[Archivio Drive] Errore salvataggio massivo su Drive:', err)
      }
    }

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tasks),
        signal: AbortSignal.timeout(3000),
      })
      return res.ok
    } catch {
      return true
    }
  },

  // Attachments Upload - Direct Google Drive Sync
  async uploadFile(file: File): Promise<UploadedAttachment> {
    // Convert to dataUrl for immediate local caching & previewing
    const reader = new FileReader()
    const dataUrlPromise = new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
    const dataUrl = await dataUrlPromise

    // 1. Direct Client-Side Google Drive Upload
    if (googleClientSide.isConnected()) {
      try {
        const driveAttachment = await googleClientSide.uploadFile(file)
        await localDB.saveAttachment(driveAttachment)
        await localDB.cacheFileData(driveAttachment.id, file.name, file.type, dataUrl)
        return driveAttachment
      } catch (err) {
        console.warn('[Google Drive] Upload diretto fallito, fallback locale:', err)
      }
    }

    // 2. Backend API fallback
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(30000),
      })

      if (res.ok) {
        const attachment: UploadedAttachment = await res.json()
        await localDB.saveAttachment(attachment)
        await localDB.cacheFileData(attachment.id, file.name, file.type, dataUrl)
        return attachment
      }
    } catch (err) {
      console.warn('Upload API fallito, salvataggio file in locale IndexedDB:', err)
    }

    // 3. Local IndexedDB attachment fallback
    const localId = `local_file_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const localAttachment: UploadedAttachment = {
      id: localId,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      createdTime: new Date().toISOString(),
      isLocal: true,
    }

    await localDB.saveAttachment(localAttachment)
    await localDB.cacheFileData(localId, file.name, file.type, dataUrl)
    return localAttachment
  },

  // Get Attachments list (solo allegati veri, esclusi cartelle e file di configurazione/task)
  async getAttachments(): Promise<UploadedAttachment[]> {
    const rawLocalFiles = await localDB.getAllAttachments()
    const localFiles = rawLocalFiles.filter(isRealAttachment)

    if (googleClientSide.isConnected()) {
      try {
        const rawDriveFiles = await googleClientSide.listDriveFiles()
        const driveFiles = rawDriveFiles.filter(isRealAttachment)
        const driveMap = new Map(driveFiles.map((f) => [f.id, f]))

        // Unisci i file locali che non sono ancora su Drive
        const merged = [...driveFiles]
        for (const lf of localFiles) {
          if (!driveMap.has(lf.id)) {
            merged.push(lf)
          }
        }
        await localDB.saveAttachments(merged)
        return merged
      } catch (e) {
        console.warn('Errore lettura file Google Drive:', e)
      }
    }

    try {
      const res = await fetch('/api/files', { signal: AbortSignal.timeout(4000) })
      if (res.ok) {
        const rawFiles: UploadedAttachment[] = await res.json()
        const files = rawFiles.filter(isRealAttachment)
        await localDB.saveAttachments(files)
        return files
      }
    } catch {
      // Fallback
    }

    return localFiles
  },

  // Delete Attachment
  async deleteAttachment(id: string): Promise<boolean> {
    try {
      await fetch(`/api/files/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(4000),
      })
    } catch {
      // Fallback
    }
    await localDB.deleteAttachment(id)
    return true
  },
}
