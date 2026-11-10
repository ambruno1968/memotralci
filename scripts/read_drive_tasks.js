import { getDriveClient } from '../server/googleClient.js'

async function checkTasks() {
  const drive = getDriveClient()
  const res = await drive.files.get({
    fileId: '17XmGkiDTWYK-4SjV1yOPgYC2C-tY6Oqb',
    alt: 'media'
  })
  console.log('Content of tasks.json on Drive:', JSON.stringify(res.data, null, 2))
}

checkTasks().catch(console.error)

