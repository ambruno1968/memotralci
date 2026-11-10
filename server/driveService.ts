import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import { getDriveClient } from './googleClient.js'
import { config } from './config.js'

export interface UploadedAttachment {
  id: string
  name: string
  mimeType: string
  size: number
  webViewLink?: string
  webContentLink?: string
  thumbnailLink?: string
  createdTime: string
  isLocal?: boolean
}

// Ensure local storage directory exists for offline/local mode fallback
export const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), 'local_storage')
export const LOCAL_UPLOADS_DIR = path.resolve(LOCAL_STORAGE_DIR, 'uploads')
export const LOCAL_TASK_ARCHIVE_DIR = path.resolve(LOCAL_UPLOADS_DIR, 'Archivio_Task')

if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true })
}
if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true })
}
if (!fs.existsSync(LOCAL_TASK_ARCHIVE_DIR)) {
  fs.mkdirSync(LOCAL_TASK_ARCHIVE_DIR, { recursive: true })
}

let cachedDriveFolderId: string | null = null
let cachedTaskArchiveFolderId: string | null = null

export async function resolveDriveFolderId(drive: any): Promise<string | null> {
  const configured = (config.driveFolderId || '').trim()

  // If already an alphanumeric Google Drive ID (no spaces, length >= 15)
  if (configured && /^[a-zA-Z0-9_-]{15,}$/.test(configured)) {
    cachedDriveFolderId = configured
    return configured
  }

  if (cachedDriveFolderId) return cachedDriveFolderId

  const folderName = configured || 'allegati memotralci'

  try {
    // Search for existing folder with this name
    const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(/'/g, "\\'")}' and trashed = false`
    const res = await drive.files.list({ q, fields: 'files(id, name)' })
    const files = res.data.files || []

    if (files.length > 0 && files[0].id) {
      console.log(`[Google Drive] Trovata cartella "${files[0].name}" -> ID: ${files[0].id}`)
      cachedDriveFolderId = files[0].id
      config.driveFolderId = files[0].id
      return files[0].id
    }

    // Automatically create folder if not found
    console.log(`[Google Drive] Creazione automatica cartella "${folderName}" su Google Drive...`)
    const createRes = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Cartella creata da MemoTralci per gli allegati',
      },
      fields: 'id, name',
    })

    if (createRes.data.id) {
      console.log(`[Google Drive] Cartella creata con successo -> ID: ${createRes.data.id}`)
      cachedDriveFolderId = createRes.data.id
      config.driveFolderId = createRes.data.id
      return createRes.data.id
    }
  } catch (err: any) {
    console.warn('[Google Drive] Impossibile risolvere cartella:', err?.message || err)
  }

  return null
}

export async function resolveTaskArchiveFolderId(drive: any): Promise<string | null> {
  if (cachedTaskArchiveFolderId) return cachedTaskArchiveFolderId

  const parentFolderId = await resolveDriveFolderId(drive)
  if (!parentFolderId) return null

  const folderName = 'Archivio_Task'

  try {
    const q = `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`
    const res = await drive.files.list({ q, fields: 'files(id, name)' })
    const files = res.data.files || []

    if (files.length > 0 && files[0].id) {
      console.log(`[Google Drive] Trovata sottocartella task "${files[0].name}" -> ID: ${files[0].id}`)
      cachedTaskArchiveFolderId = files[0].id
      return files[0].id
    }

    // Automatically create subfolder inside main attachments folder
    console.log(`[Google Drive] Creazione sottocartella "${folderName}" dentro cartella allegati...`)
    const createRes = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
        description: 'Archivio delle attività MemoTralci organizzate per data e descrizione',
      },
      fields: 'id, name',
    })

    if (createRes.data.id) {
      console.log(`[Google Drive] Sottocartella task creata con successo -> ID: ${createRes.data.id}`)
      cachedTaskArchiveFolderId = createRes.data.id
      return createRes.data.id
    }
  } catch (err: any) {
    console.warn('[Google Drive] Impossibile risolvere sottocartella task archive:', err?.message || err)
  }

  return null
}

export async function uploadAttachment(
  file: Express.Multer.File
): Promise<UploadedAttachment> {
  const drive = getDriveClient()

  if (drive) {
    try {
      const folderId = await resolveDriveFolderId(drive)
      const parents = folderId ? [folderId] : undefined

      const response = await drive.files.create({
        requestBody: {
          name: file.originalname,
          parents,
          description: 'Allegato caricato tramite MemoTralci PWA',
        },
        media: {
          mimeType: file.mimetype,
          body: Readable.from(file.buffer),
        },
        fields: 'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, createdTime',
      })

      const data = response.data
      return {
        id: data.id || `file_${Date.now()}`,
        name: data.name || file.originalname,
        mimeType: data.mimeType || file.mimetype,
        size: data.size ? parseInt(data.size, 10) : file.size,
        webViewLink: data.webViewLink || undefined,
        webContentLink: data.webContentLink || undefined,
        thumbnailLink: data.thumbnailLink || undefined,
        createdTime: data.createdTime || new Date().toISOString(),
        isLocal: false,
      }
    } catch (err: any) {
      console.error('[Google Drive] Errore upload su Google Drive, salvataggio locale:', err?.message || err)
    }
  }

  // Local fallback
  const uniqueName = `${Date.now()}_${file.originalname}`
  const localFilePath = path.join(LOCAL_UPLOADS_DIR, uniqueName)
  fs.writeFileSync(localFilePath, file.buffer)

  return {
    id: uniqueName,
    name: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    webViewLink: `/api/files/${encodeURIComponent(uniqueName)}/download`,
    webContentLink: `/api/files/${encodeURIComponent(uniqueName)}/download`,
    createdTime: new Date().toISOString(),
    isLocal: true,
  }
}

export async function listDriveAttachments(): Promise<UploadedAttachment[]> {
  const drive = getDriveClient()

  if (drive) {
    try {
      const folderId = await resolveDriveFolderId(drive)
      const q = folderId
        ? `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`
        : "trashed = false and mimeType != 'application/vnd.google-apps.folder'"

      const response = await drive.files.list({
        q,
        fields: 'files(id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, createdTime)',
        pageSize: 100,
        orderBy: 'createdTime desc',
      })

      const files = (response.data.files || []).filter((f: any) => {
        if (!f || !f.name) return false
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

      return files.map((f: any) => ({
        id: f.id!,
        name: f.name || 'File senza nome',
        mimeType: f.mimeType || 'application/octet-stream',
        size: f.size ? parseInt(f.size, 10) : 0,
        webViewLink: f.webViewLink || undefined,
        webContentLink: f.webContentLink || undefined,
        thumbnailLink: f.thumbnailLink || undefined,
        createdTime: f.createdTime || new Date().toISOString(),
        isLocal: false,
      }))
    } catch (err: any) {
      console.error('[Google Drive] Errore list file da Google Drive:', err?.message || err)
    }
  }

  // Return local files
  if (fs.existsSync(LOCAL_UPLOADS_DIR)) {
    const files = fs.readdirSync(LOCAL_UPLOADS_DIR).filter((fileName) => {
      const filePath = path.join(LOCAL_UPLOADS_DIR, fileName)
      try {
        return !fs.statSync(filePath).isDirectory() && fileName !== 'tasks.json' && fileName !== '_tasks_index.json'
      } catch {
        return false
      }
    })
    return files.map((fileName) => {
      const filePath = path.join(LOCAL_UPLOADS_DIR, fileName)
      const stat = fs.statSync(filePath)
      const originalName = fileName.replace(/^\d+_/, '')
      return {
        id: fileName,
        name: originalName,
        mimeType: 'application/octet-stream',
        size: stat.size,
        webViewLink: `/api/files/${encodeURIComponent(fileName)}/download`,
        webContentLink: `/api/files/${encodeURIComponent(fileName)}/download`,
        createdTime: stat.birthtime.toISOString(),
        isLocal: true,
      }
    })
  }

  return []
}

export async function deleteAttachment(fileId: string): Promise<boolean> {
  const drive = getDriveClient()
  if (drive && !fileId.includes('_')) {
    try {
      await drive.files.delete({ fileId })
      return true
    } catch (err: any) {
      console.error('[Google Drive] Errore eliminazione file da Google Drive:', err?.message || err)
    }
  }

  // Check local file
  const localFilePath = path.join(LOCAL_UPLOADS_DIR, fileId)
  if (fs.existsSync(localFilePath)) {
    fs.unlinkSync(localFilePath)
    return true
  }

  return false
}

export function getLocalFilePath(fileId: string): string | null {
  const localFilePath = path.join(LOCAL_UPLOADS_DIR, fileId)
  if (fs.existsSync(localFilePath) && !fs.statSync(localFilePath).isDirectory()) {
    return localFilePath
  }
  const taskFilePath = path.join(LOCAL_TASK_ARCHIVE_DIR, fileId)
  if (fs.existsSync(taskFilePath) && !fs.statSync(taskFilePath).isDirectory()) {
    return taskFilePath
  }
  return null
}
