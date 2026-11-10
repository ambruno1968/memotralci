import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import { getDriveClient } from './googleClient.js'
import { resolveTaskArchiveFolderId, LOCAL_STORAGE_DIR, LOCAL_TASK_ARCHIVE_DIR } from './driveService.js'

export interface AppTaskItem {
  id: string
  title: string
  description?: string
  completed: boolean
  dueDate?: string
  priority: 'bassa' | 'media' | 'alta' | 'urgente'
  category?: 'lavoro' | 'personale' | 'spesa' | 'progetto' | 'altro'
  subtasks?: {
    id: string
    title: string
    completed: boolean
  }[]
  attachments?: {
    id: string
    name: string
    mimeType: string
    size: number
    url?: string
  }[]
  calendarEventId?: string
  createdAt: string
  updatedAt: string
}

const TASKS_CACHE_FILE = path.join(LOCAL_STORAGE_DIR, 'tasks.json')
const TASKS_INDEX_FILENAME = '_tasks_index.json'

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Genera il nome file archiviato basato su [DATA] e DESCRIZIONE / TITOLO
 * Esempio: [2026-11-20] Revisione bilancio - Verifica spese_task_123.json
 */
export function getTaskFileName(task: AppTaskItem): string {
  const date =
    task.dueDate ||
    (task.createdAt ? task.createdAt.split('T')[0] : new Date().toISOString().split('T')[0])
  const cleanTitle = sanitizeFileName(task.title || 'Attivita')
  const cleanDesc = task.description ? sanitizeFileName(task.description).slice(0, 40) : ''
  const base = cleanDesc ? `${cleanTitle} - ${cleanDesc}` : cleanTitle
  const shortBase = base.slice(0, 70).trim()
  return `[${date}] ${shortBase}_${task.id}.json`
}

function readLocalTasks(): AppTaskItem[] {
  // 1. Prova da indice locale
  if (fs.existsSync(TASKS_CACHE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(TASKS_CACHE_FILE, 'utf8'))
      if (Array.isArray(data) && data.length > 0) return data
    } catch {}
  }

  // 2. Se non c'è indice o è vuoto, scansiona i singoli file nella sottocartella Archivio_Task
  if (fs.existsSync(LOCAL_TASK_ARCHIVE_DIR)) {
    try {
      const files = fs.readdirSync(LOCAL_TASK_ARCHIVE_DIR)
      const tasks: AppTaskItem[] = []
      for (const file of files) {
        if (file.endsWith('.json') && file !== TASKS_INDEX_FILENAME) {
          try {
            const content = JSON.parse(
              fs.readFileSync(path.join(LOCAL_TASK_ARCHIVE_DIR, file), 'utf8')
            )
            if (content && content.id && content.title) {
              tasks.push(content)
            }
          } catch {}
        }
      }
      if (tasks.length > 0) {
        // Ordina per data decrescente
        tasks.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
        writeLocalTasks(tasks)
        return tasks
      }
    } catch {}
  }

  return []
}

function writeLocalTasks(tasks: AppTaskItem[]) {
  if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
    fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true })
  }
  if (!fs.existsSync(LOCAL_TASK_ARCHIVE_DIR)) {
    fs.mkdirSync(LOCAL_TASK_ARCHIVE_DIR, { recursive: true })
  }

  // 1. Scrivi cache principale
  fs.writeFileSync(TASKS_CACHE_FILE, JSON.stringify(tasks, null, 2))
  fs.writeFileSync(path.join(LOCAL_TASK_ARCHIVE_DIR, TASKS_INDEX_FILENAME), JSON.stringify(tasks, null, 2))

  // 2. Scrivi ogni task come file individuale archiviato per data/descrizione
  const currentTaskIds = new Set(tasks.map((t) => t.id))

  // Rimuovi eventuali file orfani di task eliminati
  try {
    const existingFiles = fs.readdirSync(LOCAL_TASK_ARCHIVE_DIR)
    for (const f of existingFiles) {
      if (f.endsWith('.json') && f !== TASKS_INDEX_FILENAME) {
        const match = f.match(/_([^_]+)\.json$/)
        if (match && !currentTaskIds.has(match[1])) {
          try {
            fs.unlinkSync(path.join(LOCAL_TASK_ARCHIVE_DIR, f))
          } catch {}
        }
      }
    }
  } catch {}

  // Salva o aggiorna i singoli file task
  for (const task of tasks) {
    const fileName = getTaskFileName(task)
    const filePath = path.join(LOCAL_TASK_ARCHIVE_DIR, fileName)

    // Se esiste già un file per questo task ma con nome diverso (es. titolo/data cambiata), eliminalo
    try {
      const existingFiles = fs.readdirSync(LOCAL_TASK_ARCHIVE_DIR)
      for (const f of existingFiles) {
        if (f.endsWith(`_${task.id}.json`) && f !== fileName) {
          try {
            fs.unlinkSync(path.join(LOCAL_TASK_ARCHIVE_DIR, f))
          } catch {}
        }
      }
    } catch {}

    fs.writeFileSync(filePath, JSON.stringify(task, null, 2))
  }
}

export async function listTasks(): Promise<AppTaskItem[]> {
  const drive = getDriveClient()

  if (drive) {
    try {
      const archiveFolderId = await resolveTaskArchiveFolderId(drive)
      if (archiveFolderId) {
        // Cerca l'indice principale nella sottocartella Archivio_Task
        const indexSearch = await drive.files.list({
          q: `'${archiveFolderId}' in parents and name = '${TASKS_INDEX_FILENAME}' and trashed = false`,
          fields: 'files(id, name)',
          pageSize: 1,
        })

        const indexFile = indexSearch.data.files?.[0]
        if (indexFile?.id) {
          const fileContent = await drive.files.get({
            fileId: indexFile.id,
            alt: 'media',
          })
          const tasks =
            typeof fileContent.data === 'string'
              ? JSON.parse(fileContent.data)
              : fileContent.data
          if (Array.isArray(tasks)) {
            writeLocalTasks(tasks)
            return tasks
          }
        }

        // Se non c'è l'indice, leggi i singoli file task archiviati
        const filesList = await drive.files.list({
          q: `'${archiveFolderId}' in parents and trashed = false and mimeType = 'application/json' and name != '${TASKS_INDEX_FILENAME}'`,
          fields: 'files(id, name)',
          pageSize: 100,
        })

        const files = filesList.data.files || []
        if (files.length > 0) {
          const tasks: AppTaskItem[] = []
          for (const f of files) {
            try {
              const res = await drive.files.get({ fileId: f.id, alt: 'media' })
              const task = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
              if (task && task.id && task.title) {
                tasks.push(task)
              }
            } catch {}
          }
          if (tasks.length > 0) {
            tasks.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
            writeLocalTasks(tasks)
            // Ricrea l'indice per le future letture veloci
            await saveTasks(tasks)
            return tasks
          }
        }
      }
    } catch (err: any) {
      console.error('[Google Drive Archivio Task] Errore lettura da Drive, uso archivio locale:', err?.message || err)
    }
  }

  return readLocalTasks()
}

export async function saveTasks(tasks: AppTaskItem[]): Promise<void> {
  // Salva subito nella sottocartella locale per sicurezza e risposta istantanea
  writeLocalTasks(tasks)

  const drive = getDriveClient()
  if (drive) {
    try {
      const archiveFolderId = await resolveTaskArchiveFolderId(drive)
      if (archiveFolderId) {
        // 1. Salva o aggiorna l'indice principale nella sottocartella
        const searchRes = await drive.files.list({
          q: `'${archiveFolderId}' in parents and name = '${TASKS_INDEX_FILENAME}' and trashed = false`,
          fields: 'files(id, name)',
          pageSize: 1,
        })

        const indexFile = searchRes.data.files?.[0]
        const jsonBuffer = Buffer.from(JSON.stringify(tasks, null, 2), 'utf8')

        if (indexFile?.id) {
          await drive.files.update({
            fileId: indexFile.id,
            media: {
              mimeType: 'application/json',
              body: Readable.from(jsonBuffer),
            },
          })
        } else {
          await drive.files.create({
            requestBody: {
              name: TASKS_INDEX_FILENAME,
              parents: [archiveFolderId],
              description: 'Indice generale delle cose da fare MemoTralci',
            },
            media: {
              mimeType: 'application/json',
              body: Readable.from(jsonBuffer),
            },
          })
        }

        // 2. Salva o aggiorna ogni singolo file task archiviato nella sottocartella
        // Ottieni lista dei file esistenti nella cartella
        const existingDriveFilesRes = await drive.files.list({
          q: `'${archiveFolderId}' in parents and trashed = false and name != '${TASKS_INDEX_FILENAME}'`,
          fields: 'files(id, name)',
          pageSize: 100,
        })
        const driveFiles = existingDriveFilesRes.data.files || []
        const currentTaskIds = new Set(tasks.map((t) => t.id))

        // Elimina file remoti di task che non esistono più
        for (const df of driveFiles) {
          const match = df.name?.match(/_([^_]+)\.json$/)
          if (match && !currentTaskIds.has(match[1])) {
            try {
              await drive.files.delete({ fileId: df.id })
            } catch {}
          }
        }

        // Salva/aggiorna ogni task
        for (const task of tasks) {
          const expectedName = getTaskFileName(task)
          const matchedDriveFile = driveFiles.find((df: any) => df.name?.endsWith(`_${task.id}.json`))
          const taskBuffer = Buffer.from(JSON.stringify(task, null, 2), 'utf8')

          if (matchedDriveFile) {
            await drive.files.update({
              fileId: matchedDriveFile.id,
              requestBody: {
                name: expectedName,
              },
              media: {
                mimeType: 'application/json',
                body: Readable.from(taskBuffer),
              },
            })
          } else {
            await drive.files.create({
              requestBody: {
                name: expectedName,
                parents: [archiveFolderId],
                description: `Attività: ${task.title} - Scadenza: ${task.dueDate || 'Nessuna'}`,
              },
              media: {
                mimeType: 'application/json',
                body: Readable.from(taskBuffer),
              },
            })
          }
        }
      }
    } catch (err: any) {
      console.error('[Google Drive Archivio Task] Errore salvataggio task su Google Drive:', err?.message || err)
    }
  }
}
