import fs from 'fs'
import path from 'path'
import { getCalendarClient } from './googleClient.js'
import { config } from './config.js'

export interface AppCalendarEvent {
  id: string
  title: string
  description?: string
  location?: string
  start: string // ISO string or YYYY-MM-DD
  end: string // ISO string or YYYY-MM-DD
  allDay: boolean
  category?: 'lavoro' | 'personale' | 'riunione' | 'urgente' | 'altro'
  color?: string
  attachments?: {
    id: string
    name: string
    mimeType: string
    size: number
    url?: string
  }[]
  googleEventId?: string
}

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), 'local_storage')
const EVENTS_FILE = path.join(LOCAL_STORAGE_DIR, 'events.json')

function readLocalEvents(): AppCalendarEvent[] {
  if (fs.existsSync(EVENTS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'))
    } catch {
      return []
    }
  }
  return []
}

function writeLocalEvents(events: AppCalendarEvent[]) {
  if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
    fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true })
  }
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2))
}

export async function listCalendarEvents(
  timeMin?: string,
  timeMax?: string
): Promise<AppCalendarEvent[]> {
  const calendar = getCalendarClient()

  if (calendar && config.calendarId) {
    try {
      const response = await calendar.events.list({
        calendarId: config.calendarId,
        timeMin: timeMin || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        timeMax: timeMax || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250,
      })

      const items = response.data.items || []
      return items.map((item) => {
        const isAllDay = Boolean(item.start?.date)
        const start = (isAllDay ? item.start?.date : item.start?.dateTime) || new Date().toISOString()
        const end = (isAllDay ? item.end?.date : item.end?.dateTime) || start

        let category: any = 'altro'
        let attachments: any[] = []

        if (item.extendedProperties?.private) {
          category = item.extendedProperties.private.category || 'altro'
          if (item.extendedProperties.private.attachments) {
            try {
              attachments = JSON.parse(item.extendedProperties.private.attachments)
            } catch {
              attachments = []
            }
          }
        }

        return {
          id: item.id || `evt_${Date.now()}`,
          title: item.summary || '(Nessun titolo)',
          description: item.description || '',
          location: item.location || '',
          start,
          end,
          allDay: isAllDay,
          category,
          attachments,
          googleEventId: item.id || undefined,
        }
      })
    } catch (err) {
      console.error('Errore durante la lettura da Google Calendar, fallback locale:', err)
    }
  }

  return readLocalEvents()
}

export async function createCalendarEvent(
  eventData: Omit<AppCalendarEvent, 'id'>
): Promise<AppCalendarEvent> {
  const calendar = getCalendarClient()

  if (calendar && config.calendarId) {
    try {
      const startProp = eventData.allDay
        ? { date: eventData.start.split('T')[0] }
        : { dateTime: new Date(eventData.start).toISOString() }
      const endProp = eventData.allDay
        ? { date: eventData.end.split('T')[0] }
        : { dateTime: new Date(eventData.end).toISOString() }

      const response = await calendar.events.insert({
        calendarId: config.calendarId,
        requestBody: {
          summary: eventData.title,
          description: eventData.description,
          location: eventData.location,
          start: startProp,
          end: endProp,
          extendedProperties: {
            private: {
              category: eventData.category || 'altro',
              attachments: JSON.stringify(eventData.attachments || []),
            },
          },
        },
      })

      const item = response.data
      return {
        id: item.id!,
        title: item.summary || eventData.title,
        description: item.description || eventData.description,
        location: item.location || eventData.location,
        start: eventData.start,
        end: eventData.end,
        allDay: eventData.allDay,
        category: eventData.category,
        attachments: eventData.attachments,
        googleEventId: item.id || undefined,
      }
    } catch (err) {
      console.error('Errore creazione evento su Google Calendar, salvataggio locale:', err)
    }
  }

  // Local fallback
  const newEvent: AppCalendarEvent = {
    ...eventData,
    id: `local_evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
  }
  const events = readLocalEvents()
  events.push(newEvent)
  writeLocalEvents(events)
  return newEvent
}

export async function updateCalendarEvent(
  eventId: string,
  eventData: Partial<AppCalendarEvent>
): Promise<AppCalendarEvent | null> {
  const calendar = getCalendarClient()

  if (calendar && config.calendarId && !eventId.startsWith('local_')) {
    try {
      const existing = await calendar.events.get({
        calendarId: config.calendarId,
        eventId,
      })

      const isAllDay = eventData.allDay !== undefined ? eventData.allDay : Boolean(existing.data.start?.date)
      const startProp = eventData.start
        ? isAllDay
          ? { date: eventData.start.split('T')[0] }
          : { dateTime: new Date(eventData.start).toISOString() }
        : existing.data.start
      const endProp = eventData.end
        ? isAllDay
          ? { date: eventData.end.split('T')[0] }
          : { dateTime: new Date(eventData.end).toISOString() }
        : existing.data.end

      const response = await calendar.events.patch({
        calendarId: config.calendarId,
        eventId,
        requestBody: {
          summary: eventData.title,
          description: eventData.description,
          location: eventData.location,
          start: startProp,
          end: endProp,
          extendedProperties: {
            private: {
              category: eventData.category || existing.data.extendedProperties?.private?.category || 'altro',
              attachments: JSON.stringify(
                eventData.attachments !== undefined
                  ? eventData.attachments
                  : JSON.parse(existing.data.extendedProperties?.private?.attachments || '[]')
              ),
            },
          },
        },
      })

      const item = response.data
      return {
        id: item.id!,
        title: item.summary || '',
        description: item.description || '',
        location: item.location || '',
        start: eventData.start || item.start?.dateTime || item.start?.date || '',
        end: eventData.end || item.end?.dateTime || item.end?.date || '',
        allDay: isAllDay,
        category: eventData.category,
        attachments: eventData.attachments,
        googleEventId: item.id || undefined,
      }
    } catch (err) {
      console.error('Errore aggiornamento evento Google Calendar:', err)
    }
  }

  // Local fallback
  const events = readLocalEvents()
  const index = events.findIndex((e) => e.id === eventId)
  if (index >= 0) {
    events[index] = { ...events[index], ...eventData }
    writeLocalEvents(events)
    return events[index]
  }

  return null
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const calendar = getCalendarClient()

  if (calendar && config.calendarId && !eventId.startsWith('local_')) {
    try {
      await calendar.events.delete({
        calendarId: config.calendarId,
        eventId,
      })
      return true
    } catch (err) {
      console.error('Errore eliminazione evento da Google Calendar:', err)
    }
  }

  // Local fallback
  const events = readLocalEvents()
  const filtered = events.filter((e) => e.id !== eventId)
  if (filtered.length !== events.length) {
    writeLocalEvents(filtered)
    return true
  }

  return false
}

