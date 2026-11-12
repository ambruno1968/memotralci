import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AppCalendarEvent } from '../types/event.ts'
import type { AppTaskItem } from '../types/task.ts'
import type { UploadedAttachment } from '../types/attachment.ts'
import type { AppNoteItem } from '../types/note.ts'

interface AuthSessionRecord {
  id: string
  token?: string | null
  tokenExpires?: number | null
  refreshToken?: string | null
  user?: any | null
  calendarId?: string | null
  folderId?: string | null
  taskFolderId?: string | null
  explicitlyDisconnected?: boolean
  updatedAt: number
}

interface MemoTralciDB extends DBSchema {
  events: {
    key: string
    value: AppCalendarEvent
  }
  tasks: {
    key: string
    value: AppTaskItem
  }
  attachments: {
    key: string
    value: UploadedAttachment
  }
  cachedFiles: {
    key: string
    value: { id: string; dataUrl: string; name: string; type: string }
  }
  authSession: {
    key: string
    value: AuthSessionRecord
  }
  notes: {
    key: string
    value: AppNoteItem
  }
}

let dbPromise: Promise<IDBPDatabase<MemoTralciDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MemoTralciDB>('memotralci_pwa_db', 3, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('events')) {
          db.createObjectStore('events', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('attachments')) {
          db.createObjectStore('attachments', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('cachedFiles')) {
          db.createObjectStore('cachedFiles', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('authSession')) {
          db.createObjectStore('authSession', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('notes')) {
          db.createObjectStore('notes', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

export const localDB = {
  // Events
  async getAllEvents(): Promise<AppCalendarEvent[]> {
    const db = await getDB()
    return db.getAll('events')
  },
  async saveEvent(event: AppCalendarEvent): Promise<void> {
    const db = await getDB()
    await db.put('events', event)
  },
  async saveEvents(events: AppCalendarEvent[]): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('events', 'readwrite')
    await tx.store.clear()
    for (const evt of events) {
      await tx.store.put(evt)
    }
    await tx.done
  },
  async deleteEvent(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('events', id)
  },

  // Tasks
  async getAllTasks(): Promise<AppTaskItem[]> {
    const db = await getDB()
    return db.getAll('tasks')
  },
  async saveTasks(tasks: AppTaskItem[]): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('tasks', 'readwrite')
    await tx.store.clear()
    for (const task of tasks) {
      await tx.store.put(task)
    }
    await tx.done
  },
  async saveTask(task: AppTaskItem): Promise<void> {
    const db = await getDB()
    await db.put('tasks', task)
  },
  async deleteTask(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('tasks', id)
  },

  // Attachments
  async getAllAttachments(): Promise<UploadedAttachment[]> {
    const db = await getDB()
    return db.getAll('attachments')
  },
  async saveAttachment(att: UploadedAttachment): Promise<void> {
    const db = await getDB()
    await db.put('attachments', att)
  },
  async saveAttachments(atts: UploadedAttachment[]): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('attachments', 'readwrite')
    for (const a of atts) {
      await tx.store.put(a)
    }
    await tx.done
  },
  async deleteAttachment(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('attachments', id)
    await db.delete('cachedFiles', id)
  },

  // Notes (Post-it)
  async getAllNotes(): Promise<AppNoteItem[]> {
    const db = await getDB()
    return db.getAll('notes')
  },
  async saveNote(note: AppNoteItem): Promise<void> {
    const db = await getDB()
    await db.put('notes', note)
  },
  async saveNotes(notes: AppNoteItem[]): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('notes', 'readwrite')
    await tx.store.clear()
    for (const n of notes) {
      await tx.store.put(n)
    }
    await tx.done
  },
  async deleteNote(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('notes', id)
  },

  // Cache File blob data
  async cacheFileData(id: string, name: string, type: string, dataUrl: string) {
    const db = await getDB()
    await db.put('cachedFiles', { id, name, type, dataUrl })
  },
  async getCachedFileData(id: string) {
    const db = await getDB()
    return db.get('cachedFiles', id)
  },
  async clearCachedFiles(): Promise<void> {
    const db = await getDB()
    await db.clear('cachedFiles')
  },

  // Persistenza sessione Account Google in IndexedDB (anti-disconnessione)
  async saveAuthSession(session: Omit<AuthSessionRecord, 'id' | 'updatedAt'>): Promise<void> {
    try {
      const db = await getDB()
      const existing = await db.get('authSession', 'google_account')
      await db.put('authSession', {
        ...(existing || {}),
        ...session,
        id: 'google_account',
        updatedAt: Date.now(),
      })
    } catch (e) {
      console.warn('[DB] Errore salvataggio authSession in IndexedDB:', e)
    }
  },
  async getAuthSession(): Promise<AuthSessionRecord | undefined> {
    try {
      const db = await getDB()
      return await db.get('authSession', 'google_account')
    } catch {
      return undefined
    }
  },
  async clearAuthSession(): Promise<void> {
    try {
      const db = await getDB()
      await db.put('authSession', {
        id: 'google_account',
        token: null,
        tokenExpires: null,
        refreshToken: null,
        user: null,
        explicitlyDisconnected: true,
        updatedAt: Date.now(),
      })
    } catch {}
  },

  // Export & Import full backup
  async exportAllData() {
    const db = await getDB()
    const events = await db.getAll('events')
    const tasks = await db.getAll('tasks')
    const attachments = await db.getAll('attachments')
    return {
      version: 1,
      appName: 'MemoTralci',
      exportedAt: new Date().toISOString(),
      events,
      tasks,
      attachments,
    }
  },
  async importAllData(data: any) {
    const db = await getDB()
    if (data?.events && Array.isArray(data.events)) {
      const tx = db.transaction('events', 'readwrite')
      for (const evt of data.events) {
        await tx.store.put(evt)
      }
      await tx.done
    }
    if (data?.tasks && Array.isArray(data.tasks)) {
      const tx = db.transaction('tasks', 'readwrite')
      for (const t of data.tasks) {
        await tx.store.put(t)
      }
      await tx.done
    }
    if (data?.attachments && Array.isArray(data.attachments)) {
      const tx = db.transaction('attachments', 'readwrite')
      for (const a of data.attachments) {
        await tx.store.put(a)
      }
      await tx.done
    }
  },
}
