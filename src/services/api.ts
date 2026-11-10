import type { AppCalendarEvent } from '../types/event.ts'
import type { AppTaskItem } from '../types/task.ts'
import type { UploadedAttachment } from '../types/attachment.ts'
import { localDB } from './db.ts'

export interface GoogleStatus {
  isOnline: boolean
  isGoogleConfigured: boolean
  calendarId: string | null
  driveFolderId: string | null
  serviceAccountConfigured: boolean
}

export const api = {
  // Check backend & Google status
  async getStatus(): Promise<GoogleStatus> {
    try {
      const res = await fetch('/api/status', { signal: AbortSignal.timeout(3000) })
      if (!res.ok) throw new Error('Status check failed')
      const data = await res.json()
      return {
        isOnline: true,
        isGoogleConfigured: Boolean(data.isGoogleConfigured),
        calendarId: data.calendarId || null,
        driveFolderId: data.driveFolderId || null,
        serviceAccountConfigured: Boolean(data.serviceAccountConfigured),
      }
    } catch {
      return {
        isOnline: false,
        isGoogleConfigured: false,
        calendarId: null,
        driveFolderId: null,
        serviceAccountConfigured: false,
      }
    }
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
      })
      if (!res.ok) {
        const err = await res.json()
        return { success: false, error: err.error || 'Errore salvataggio' }
      }
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Server non raggiungibile' }
    }
  },

  // Events
  async getEvents(): Promise<AppCalendarEvent[]> {
    try {
      const res = await fetch('/api/events', { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const events: AppCalendarEvent[] = await res.json()
        await localDB.saveEvents(events)
        return events
      }
    } catch {
      // Fallback
    }
    return localDB.getAllEvents()
  },

  async createEvent(eventData: Omit<AppCalendarEvent, 'id'>): Promise<AppCalendarEvent> {
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
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        await localDB.deleteEvent(id)
        return true
      }
    } catch {
      // Fallback
    }
    await localDB.deleteEvent(id)
    return true
  },

  // Tasks
  async getTasks(): Promise<AppTaskItem[]> {
    try {
      const res = await fetch('/api/tasks', { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const tasks: AppTaskItem[] = await res.json()
        await localDB.saveTasks(tasks)
        return tasks
      }
    } catch {
      // Fallback
    }
    return localDB.getAllTasks()
  },

  async saveTasks(tasks: AppTaskItem[]): Promise<boolean> {
    await localDB.saveTasks(tasks)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tasks),
        signal: AbortSignal.timeout(5000),
      })
      return res.ok
    } catch {
      return false
    }
  },

  // Attachments Upload
  async uploadFile(file: File): Promise<UploadedAttachment> {
    const formData = new FormData()
    formData.append('file', file)

    // Convert to dataUrl for immediate local caching & previewing
    const reader = new FileReader()
    const dataUrlPromise = new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
    const dataUrl = await dataUrlPromise

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(30000), // 30s timeout for file upload
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

    // Local IndexedDB attachment fallback
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

  // Get Attachments list
  async getAttachments(): Promise<UploadedAttachment[]> {
    try {
      const res = await fetch('/api/files', { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const files: UploadedAttachment[] = await res.json()
        await localDB.saveAttachments(files)
        return files
      }
    } catch {
      // Fallback
    }
    return localDB.getAllAttachments()
  },

  // Delete Attachment
  async deleteAttachment(id: string): Promise<boolean> {
    try {
      await fetch(`/api/files/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(5000),
      })
    } catch {
      // Fallback
    }
    await localDB.deleteAttachment(id)
    return true
  },
}
