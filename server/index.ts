import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { config, reloadConfig } from './config.js'
import {
  listCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
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
  res.json({
    status: 'ok',
    isGoogleConfigured: currentConfig.isGoogleConfigured,
    calendarId: currentConfig.calendarId || null,
    driveFolderId: currentConfig.driveFolderId || null,
    serviceAccountConfigured: Boolean(
      currentConfig.serviceAccountJson || fs.existsSync(currentConfig.serviceAccountPath)
    ),
    serverTime: new Date().toISOString(),
  })
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
      } catch (jsonErr) {
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

// Serve static frontend files if production build exists
const distPath = path.resolve(process.cwd(), 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distPath, 'index.html'))
    }
    next()
  })
}

const PORT = config.port
app.listen(PORT, () => {
  console.log(`MemoTralci Server API attivo su http://localhost:${PORT}`)
  console.log(`Stato Google: ${config.isGoogleConfigured ? '🟢 Connesso' : '🟡 Modalità Locale/Offline'}`)
})
