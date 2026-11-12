import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { config, reloadConfig } from './config.js'
import {
  inspectCredentials,
  isOAuthConnected,
  getOAuthAuthUrl,
  handleOAuthCallback,
  disconnectOAuthTokens,
  getDriveClient,
} from './googleClient.js'
import {
  listCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  listAvailableCalendars,
  getResolvedCalendarInfo,
} from './calendarService.js'
import {
  uploadAttachment,
  listDriveAttachments,
  deleteAttachment,
  getLocalFilePath,
} from './driveService.js'
import { listTasks, saveTasks, AppTaskItem } from './taskService.js'

const app = express()

// Multer in-memory storage for Google Drive streaming
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
})

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Status & Health Check
app.get('/api/status', async (req, res) => {
  const currentConfig = reloadConfig()
  const creds = inspectCredentials()
  const calInfo = getResolvedCalendarInfo()

  res.json({
    status: 'ok',
    isGoogleConfigured: currentConfig.isGoogleConfigured,
    authType: currentConfig.authType,
    credentialType: creds.type,
    calendarId: currentConfig.calendarId || null,
    resolvedCalendar: calInfo.summary,
    driveFolderId: currentConfig.driveFolderId || null,
    serviceAccountConfigured: Boolean(
      currentConfig.serviceAccountJson || fs.existsSync(currentConfig.serviceAccountPath)
    ),
    oauthConnected: isOAuthConnected(),
    serverTime: new Date().toISOString(),
  })
})

// List available Google Calendars (e.g. to find "Segreteria")
app.get('/api/calendars', async (req, res) => {
  try {
    const calendars = await listAvailableCalendars()
    res.json({ calendars, resolved: getResolvedCalendarInfo() })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Errore recupero calendari' })
  }
})

// OAuth2 Auth URL
app.get('/api/auth/google/url', (req, res) => {
  try {
    const redirectUri = req.query.redirectUri as string | undefined
    const url = getOAuthAuthUrl(redirectUri)
    if (!url) {
      return res.status(400).json({
        error: 'Client OAuth non configurato o credenziali non di tipo OAuth Web Client.',
      })
    }
    res.json({ url })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// OAuth2 Callback
app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const code = req.query.code as string
    if (!code) {
      return res.status(400).send('Codice autorizzazione mancante.')
    }
    await handleOAuthCallback(code)
    reloadConfig()
    // Redirect back to client app
    res.redirect('http://localhost:5173/?google_connected=true')
  } catch (err: any) {
    console.error('Errore callback OAuth Google:', err)
    res.status(500).send(`Errore autorizzazione Google: ${err.message}`)
  }
})

// OAuth2 Disconnect
app.post('/api/auth/google/disconnect', (req, res) => {
  try {
    disconnectOAuthTokens()
    reloadConfig()
    res.json({ success: true, message: 'Disconnesso da Google' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Update Configuration from UI
app.post('/api/config', async (req, res) => {
  try {
    const { calendarId, driveFolderId, serviceAccountJson } = req.body

    if (calendarId !== undefined) {
      config.calendarId = calendarId
      process.env.GOOGLE_CALENDAR_ID = calendarId
    }
    if (driveFolderId !== undefined) {
      config.driveFolderId = driveFolderId
      process.env.GOOGLE_DRIVE_FOLDER_ID = driveFolderId
    }
    if (serviceAccountJson) {
      try {
        // Validate JSON
        JSON.parse(serviceAccountJson)
        fs.writeFileSync(config.serviceAccountPath, serviceAccountJson, 'utf8')
      } catch {
        return res.status(400).json({ error: 'Formato JSON del Service Account non valido' })
      }
    }

    // Save to .env for persistence
    let envContent = ''
    if (fs.existsSync('.env')) {
      envContent = fs.readFileSync('.env', 'utf8')
    }
    const envMap: Record<string, string> = {}
    envContent.split('\n').forEach((line) => {
      const idx = line.indexOf('=')
      if (idx > 0) {
        envMap[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
      }
    })

    if (config.calendarId) envMap['GOOGLE_CALENDAR_ID'] = config.calendarId
    if (config.driveFolderId) envMap['GOOGLE_DRIVE_FOLDER_ID'] = config.driveFolderId
    envMap['GOOGLE_SERVICE_ACCOUNT_PATH'] = config.serviceAccountPath

    const newEnv = Object.entries(envMap)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')
    fs.writeFileSync('.env', newEnv, 'utf8')

    const updated = reloadConfig()
    res.json({ success: true, config: updated })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Errore salvataggio configurazione' })
  }
})

// Calendar Events Endpoints
app.get('/api/events', async (req, res) => {
  try {
    const { timeMin, timeMax } = req.query as { timeMin?: string; timeMax?: string }
    const events = await listCalendarEvents(timeMin, timeMax)
    res.json(events)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/events', async (req, res) => {
  try {
    const newEvent = await createCalendarEvent(req.body)
    res.status(201).json(newEvent)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/events/:id', async (req, res) => {
  try {
    const updated = await updateCalendarEvent(req.params.id, req.body)
    if (!updated) {
      return res.status(404).json({ error: 'Evento non trovato' })
    }
    res.json(updated)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/events/:id', async (req, res) => {
  try {
    const success = await deleteCalendarEvent(req.params.id)
    res.json({ success })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// To-Do Tasks Endpoints
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await listTasks()
    res.json(tasks)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/tasks', async (req, res) => {
  try {
    let tasks: AppTaskItem[] = []
    if (Array.isArray(req.body)) {
      tasks = req.body
    } else {
      const current = await listTasks()
      const newTask = {
        ...req.body,
        id: req.body.id || `task_${Date.now()}`,
        createdAt: req.body.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      tasks = [newTask, ...current]
    }
    await saveTasks(tasks)
    res.json({ success: true, tasks })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const current = await listTasks()
    const filtered = current.filter((t) => t.id !== req.params.id)
    await saveTasks(filtered)
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// File Upload & Attachments Endpoints
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file fornito per il caricamento' })
    }

    const attachment = await uploadAttachment(req.file)
    res.status(201).json(attachment)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Errore durante l\'upload' })
  }
})

app.get('/api/files', async (req, res) => {
  try {
    const files = await listDriveAttachments()
    res.json(files)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/files/:id/download', (req, res) => {
  const filePath = getLocalFilePath(req.params.id)
  if (filePath) {
    return res.sendFile(filePath)
  }
  res.status(404).json({ error: 'File non trovato localmente' })
})

app.delete('/api/files/:id', async (req, res) => {
  try {
    const success = await deleteAttachment(req.params.id)
    res.json({ success })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Categories - Direct _categories.json on Google Drive
app.get('/api/categories', async (_req, res) => {
  try {
    const drive = getDriveClient()
    if (!drive) return res.status(404).json({ error: 'Drive non configurato' })
    const folderId = config.driveFolderId || '1HMcovycbLn9TKAXs1CmrcSylcDZj0GXc'
    const listRes = await drive.files.list({
      q: `'${folderId}' in parents and name = '_categories.json' and trashed = false`,
      fields: 'files(id, name, modifiedTime)',
      orderBy: 'modifiedTime desc',
      pageSize: 5,
    })
    const file = listRes.data.files?.[0]
    if (!file?.id) return res.status(404).json({ error: '_categories.json non trovato' })
    const contentRes = await drive.files.get({ fileId: file.id, alt: 'media' })
    const data = typeof contentRes.data === 'string' ? JSON.parse(contentRes.data) : contentRes.data
    res.json(data)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/categories', async (req, res) => {
  try {
    const drive = getDriveClient()
    if (!drive) return res.status(404).json({ error: 'Drive non configurato' })
    const folderId = config.driveFolderId || '1HMcovycbLn9TKAXs1CmrcSylcDZj0GXc'
    const listRes = await drive.files.list({
      q: `'${folderId}' in parents and name = '_categories.json' and trashed = false`,
      fields: 'files(id)',
      orderBy: 'modifiedTime desc',
      pageSize: 5,
    })
    const file = listRes.data.files?.[0]
    const bodyStr = JSON.stringify(req.body, null, 2)
    if (file?.id) {
      await drive.files.update({
        fileId: file.id,
        media: { mimeType: 'application/json', body: bodyStr },
      })
    } else {
      await drive.files.create({
        requestBody: {
          name: '_categories.json',
          parents: [folderId],
          mimeType: 'application/json',
        },
        media: { mimeType: 'application/json', body: bodyStr },
      })
    }
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Serve static frontend files if production build exists (docs or dist)
const staticPath = fs.existsSync(path.resolve(process.cwd(), 'docs'))
  ? path.resolve(process.cwd(), 'docs')
  : path.resolve(process.cwd(), 'dist')

if (fs.existsSync(staticPath)) {
  app.use(express.static(staticPath))
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(staticPath, 'index.html'))
    }
    next()
  })
}

const PORT = config.port
app.listen(PORT, () => {
  console.log(`MemoTralci Server API attivo su http://localhost:${PORT}`)
  console.log(`Stato Google: ${config.isGoogleConfigured ? '🟢 Connesso' : '🟡 Modalità Locale/Offline'}`)
})
