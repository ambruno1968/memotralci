import { getDriveClient } from '../server/googleClient.js'
import { resolveDriveFolderId } from '../server/driveService.js'

async function checkDrive() {
  const drive = getDriveClient()
  if (!drive) {
    console.log('No drive client')
    return
  }
  const folderId = await resolveDriveFolderId(drive)
  console.log('Main folder ID:', folderId)

  // List all files in the main folder
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType, size)',
  })
  console.log('Files in main folder:', res.data.files)

  // Check subfolders
  for (const f of res.data.files) {
    if (f.mimeType === 'application/vnd.google-apps.folder') {
      const subRes = await drive.files.list({
        q: `'${f.id}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, size)',
      })
      console.log(`Files in subfolder "${f.name}" (${f.id}):`, subRes.data.files)
    }
  }
}

checkDrive().catch(console.error)
