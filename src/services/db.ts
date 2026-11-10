import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AppCalendarEvent } from '../types/event.ts'
import type { AppTaskItem } from '../types/task.ts'
import type { UploadedAttachment } from '../types/attachment.ts'

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
}

let dbPromise: Promise<IDBPDatabase<MemoTralciDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MemoTralciDB>('memotralci_pwa_db', 1, {
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

  // Cache File blob data
  async cacheFileData(id: string, name: string, type: string, dataUrl: string) {
    const db = await getDB()
    await db.put('cachedFiles', { id, name, type, dataUrl })
  },
  async getCachedFileData(id: string) {
    const db = await getDB()
    return db.get('cachedFiles', id)
  },
}
