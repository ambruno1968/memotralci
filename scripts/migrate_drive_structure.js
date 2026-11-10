import { getDriveClient } from '../server/googleClient.js'
import { resolveDriveFolderId, resolveTaskArchiveFolderId } from '../server/driveService.js'
import { saveTasks } from '../server/taskService.js'
import { Readable } from 'stream'

async function migrate() {
  const drive = getDriveClient()
  if (!drive) {
    console.error('No drive client')
    return
  }

  const rootFolderId = await resolveDriveFolderId(drive)
  const taskArchiveFolderId = await resolveTaskArchiveFolderId(drive)

  console.log('Root Folder:', rootFolderId)
  console.log('Task Archive Folder:', taskArchiveFolderId)

  // 1. Read existing tasks from root tasks.json
  const rootFilesRes = await drive.files.list({
    q: `'${rootFolderId}' in parents and name = 'tasks.json' and trashed = false`,
    fields: 'files(id, name)',
  })

  let existingTasks = []
  const oldTasksFile = rootFilesRes.data.files?.[0]
  if (oldTasksFile) {
    console.log('Found old tasks.json in root -> ID:', oldTasksFile.id)
    const contentRes = await drive.files.get({
      fileId: oldTasksFile.id,
      alt: 'media',
    })
    existingTasks = typeof contentRes.data === 'string' ? JSON.parse(contentRes.data) : contentRes.data
    console.log(`Read ${existingTasks.length} tasks from old tasks.json`)
  }

  if (existingTasks.length > 0) {
    // 2. Save using taskService to archive folder both locally and on Drive
    console.log('Saving tasks to Archivio_Task folder...')
    await saveTasks(existingTasks)

    // 3. Remove the old loose tasks.json from root folder of Drive
    console.log('Removing old tasks.json from root folder to keep Allegati clean...')
    await drive.files.delete({ fileId: oldTasksFile.id })
    console.log('Old root tasks.json deleted successfully!')
  }

  // 4. Check files in root folder
  const checkRes = await drive.files.list({
    q: `'${rootFolderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType)',
  })
  console.log('Remaining files in Allegati memotralci root:', checkRes.data.files)
}

migrate().catch(console.error)

