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
const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), 'local_storage')
const LOCAL_UPLOADS_DIR = path.resolve(LOCAL_STORAGE_DIR, 'uploads')

if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true })
}
if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true })
}

export async function uploadAttachment(
  file: Express.Multer.File
): Promise<UploadedAttachment> {
  const drive = getDriveClient()

  if (drive && config.driveFolderId) {
    try {
      const response = await drive.files.create({
        requestBody: {
          name: file.originalname,
          parents: [config.driveFolderId],
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
    } catch (err) {
      console.error('Errore durante l\'upload su Google Drive, salvataggio in locale...', err)
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

  if (drive && config.driveFolderId) {
    try {
      const response = await drive.files.list({
        q: `'${config.driveFolderId}' in parents and trashed = false and name != 'tasks.json'`,
        fields: 'files(id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, createdTime)',
        pageSize: 100,
        orderBy: 'createdTime desc',
      })

      return (response.data.files || []).map((f) => ({
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
    } catch (err) {
      console.error('Errore list file da Google Drive:', err)
    }
  }

  // Return local files
  if (fs.existsSync(LOCAL_UPLOADS_DIR)) {
    const files = fs.readdirSync(LOCAL_UPLOADS_DIR)
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
  if (drive && !fileId.includes('_') && config.driveFolderId) {
    try {
      await drive.files.delete({ fileId })
      return true
    } catch (err) {
      console.error('Errore eliminazione file da Google Drive:', err)
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
  if (fs.existsSync(localFilePath)) {
    return localFilePath
  }
  return null
}

