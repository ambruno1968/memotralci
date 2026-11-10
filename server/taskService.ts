import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import { getDriveClient } from './googleClient.js'
import { config } from './config.js'

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
  createdAt: string
  updatedAt: string
}

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), 'local_storage')
const TASKS_FILE = path.join(LOCAL_STORAGE_DIR, 'tasks.json')
const TASKS_DRIVE_FILENAME = 'tasks.json'

function readLocalTasks(): AppTaskItem[] {
  if (fs.existsSync(TASKS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'))
    } catch {
      return []
    }
  }
  return []
}

function writeLocalTasks(tasks: AppTaskItem[]) {
  if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
    fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true })
  }
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2))
}

export async function listTasks(): Promise<AppTaskItem[]> {
  const drive = getDriveClient()

  if (drive && config.driveFolderId) {
    try {
      // Find tasks.json in Google Drive
      const searchRes = await drive.files.list({
        q: `'${config.driveFolderId}' in parents and name = '${TASKS_DRIVE_FILENAME}' and trashed = false`,
        fields: 'files(id, name)',
        pageSize: 1,
      })

      const file = searchRes.data.files?.[0]
      if (file?.id) {
        const fileContent = await drive.files.get({
          fileId: file.id,
          alt: 'media',
        })
        const tasks = typeof fileContent.data === 'string' ? JSON.parse(fileContent.data) : fileContent.data
        if (Array.isArray(tasks)) {
          // Sync to local cache
          writeLocalTasks(tasks)
          return tasks
        }
      }
    } catch (err) {
      console.error('Errore lettura tasks da Google Drive, uso cache locale:', err)
    }
  }

  return readLocalTasks()
}

export async function saveTasks(tasks: AppTaskItem[]): Promise<void> {
  // Always update local cache
  writeLocalTasks(tasks)

  const drive = getDriveClient()
  if (drive && config.driveFolderId) {
    try {
      const searchRes = await drive.files.list({
        q: `'${config.driveFolderId}' in parents and name = '${TASKS_DRIVE_FILENAME}' and trashed = false`,
        fields: 'files(id, name)',
        pageSize: 1,
      })

      const file = searchRes.data.files?.[0]
      const jsonBuffer = Buffer.from(JSON.stringify(tasks, null, 2), 'utf8')

      if (file?.id) {
        // Update existing file
        await drive.files.update({
          fileId: file.id,
          media: {
            mimeType: 'application/json',
            body: Readable.from(jsonBuffer),
          },
        })
      } else {
        // Create new tasks.json file in the Google Drive folder
        await drive.files.create({
          requestBody: {
            name: TASKS_DRIVE_FILENAME,
            parents: [config.driveFolderId],
            description: 'Elenco attività MemoTralci PWA sincronizzato',
          },
          media: {
            mimeType: 'application/json',
            body: Readable.from(jsonBuffer),
          },
        })
      }
    } catch (err) {
      console.error('Errore salvataggio tasks su Google Drive:', err)
    }
  }
}

