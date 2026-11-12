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

let cachedCalendarId: string | null = null
let cachedCalendarSummary: string | null = null

export function getResolvedCalendarInfo() {
  return {
    id: cachedCalendarId || config.calendarId || 'Segreteria',
    summary: cachedCalendarSummary || config.calendarId || 'Segreteria',
  }
}

export async function resolveCalendarId(calendar: any): Promise<string> {
  const configured = (config.calendarId || '').trim()

  // If already a specific full calendar ID (like an email with @ or Google hash ID) and not just 'segreteria'
  if (configured && configured.includes('@') && configured.toLowerCase() !== 'segreteria') {
    cachedCalendarId = configured
    return configured
  }

  if (cachedCalendarId) {
    return cachedCalendarId
  }

  try {
    const listRes = await calendar.calendarList.list({ maxResults: 100 })
    const items = listRes.data.items || []

    const targetName = (configured && configured.toLowerCase() !== 'primary'
      ? configured
      : 'segreteria'
    ).toLowerCase()

    // 1. Exact match by summary name (e.g. "Segreteria")
    const exact = items.find((c: any) => c.summary && c.summary.toLowerCase().trim() === targetName)
    if (exact && exact.id) {
      console.log(`[Google Calendar] Trovato calendario "${exact.summary}" -> ID: ${exact.id}`)
      cachedCalendarId = exact.id
      cachedCalendarSummary = exact.summary
      config.calendarId = exact.id
      return exact.id
    }

    // 2. Partial match (e.g. contains "segreteria")
    const partial = items.find((c: any) => c.summary && c.summary.toLowerCase().includes(targetName))
    if (partial && partial.id) {
      console.log(`[Google Calendar] Trovato calendario corrispondente "${partial.summary}" -> ID: ${partial.id}`)
      cachedCalendarId = partial.id
      cachedCalendarSummary = partial.summary
      config.calendarId = partial.id
      return partial.id
    }

    // 3. Match by ID containing target (e.g. segreteria.cometralcinovara@gmail.com)
    const emailMatch = items.find((c: any) => c.id && c.id.toLowerCase().includes('segreteria'))
    if (emailMatch && emailMatch.id) {
      console.log(`[Google Calendar] Trovato calendario da email "${emailMatch.summary || emailMatch.id}" -> ID: ${emailMatch.id}`)
      cachedCalendarId = emailMatch.id
      cachedCalendarSummary = emailMatch.summary || 'Segreteria'
      config.calendarId = emailMatch.id
      return emailMatch.id
    }

    // 4. Primary calendar fallback
    const primary = items.find((c: any) => c.primary)
    if (primary && primary.id) {
      cachedCalendarId = primary.id
      cachedCalendarSummary = primary.summary || 'Principale'
      return primary.id
    }

    if (items.length > 0 && items[0].id) {
      cachedCalendarId = items[0].id
      cachedCalendarSummary = items[0].summary
      return items[0].id
    }
  } catch (err: any) {
    console.warn('[Google Calendar] Impossibile elencare i calendari:', err?.message || err)
  }

  return configured || 'primary'
}

export async function listAvailableCalendars(): Promise<
  { id: string; summary: string; primary: boolean; accessRole: string }[]
> {
  const calendar = getCalendarClient()
  if (!calendar) return []
  try {
    const res = await calendar.calendarList.list({ maxResults: 100 })
    return (res.data.items || []).map((c: any) => ({
      id: c.id || '',
      summary: c.summary || '(Nessun nome)',
      primary: Boolean(c.primary),
      accessRole: c.accessRole || 'reader',
    }))
  } catch (err) {
    console.error('Errore durante il recupero dei calendari:', err)
    return []
  }
}

function shiftDateOnly(dateStr: string, days: number): string {
  const clean = dateStr.split('T')[0]
  const parts = clean.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return clean
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days))
  return dt.toISOString().split('T')[0]
}

export async function listCalendarEvents(
  timeMin?: string,
  timeMax?: string
): Promise<AppCalendarEvent[]> {
  const calendar = getCalendarClient()

  if (calendar) {
    try {
      const calId = await resolveCalendarId(calendar)
      const targetCalendarIds = Array.from(new Set([calId, 'primary']))
      const effectiveTimeMin = timeMin || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
      const effectiveTimeMax = timeMax || new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString()

      const results = await Promise.allSettled(
        targetCalendarIds.map(async (cId) => {
          const response = await calendar.events.list({
            calendarId: cId,
            timeMin: effectiveTimeMin,
            timeMax: effectiveTimeMax,
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 2500,
          })
          return (response.data.items || []).map((item: any) => ({ ...item, __calendarId: cId }))
        })
      )

      const seenIds = new Set<string>()
      const items: any[] = []
      for (const r of results) {
        if (r.status === 'fulfilled') {
          for (const item of r.value) {
            if (item?.id && !seenIds.has(item.id)) {
              seenIds.add(item.id)
              items.push(item)
            }
          }
        }
      }
      const googleEvents: AppCalendarEvent[] = items
        .filter((item: any) => item && item.status !== 'cancelled')
        .map((item: any) => {
          const isAllDay = Boolean(item.start?.date)
          const start = (isAllDay ? item.start?.date : item.start?.dateTime) || new Date().toISOString()
          let end = (isAllDay ? item.end?.date : item.end?.dateTime) || start

          if (isAllDay && item.start?.date && item.end?.date && item.end.date > item.start.date) {
            end = shiftDateOnly(item.end.date, -1)
          }

          let category: any = undefined
          let categories: string[] = []
          let attachments: any[] = []

          const extProps = item.extendedProperties?.private || item.extendedProperties?.shared
          if (extProps) {
            if (extProps.categories) {
              try {
                const parsed = JSON.parse(extProps.categories)
                if (Array.isArray(parsed)) {
                  categories = parsed.filter(
                    (c: any) => typeof c === 'string' && c.trim() && c.trim().toLowerCase() !== 'altro'
                  )
                }
              } catch {}
            }
            const rawCat = extProps.category
            if (typeof rawCat === 'string' && rawCat.trim() && rawCat.trim().toLowerCase() !== 'altro') {
              for (const sc of rawCat.split(',').map((s: string) => s.trim()).filter(Boolean)) {
                if (sc.toLowerCase() !== 'altro' && !categories.includes(sc)) categories.push(sc)
              }
            }
            if (categories.length > 0) {
              category = categories.join(',')
            }
            if (extProps.attachments) {
              try {
                attachments = JSON.parse(extProps.attachments)
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
            categories,
            attachments,
            googleEventId: item.id || undefined,
          } as AppCalendarEvent
        })

      // Update local storage cache with latest Google events
      writeLocalEvents(googleEvents)
      return googleEvents
    } catch (err: any) {
      console.error('[Google Calendar] Errore lettura eventi, uso fallback locale:', err?.message || err)
    }
  }

  return readLocalEvents()
}

export async function createCalendarEvent(
  eventData: Omit<AppCalendarEvent, 'id'>
): Promise<AppCalendarEvent> {
  const calendar = getCalendarClient()

  if (calendar) {
    try {
      const calId = await resolveCalendarId(calendar)
      const startProp = eventData.allDay
        ? { date: eventData.start.split('T')[0] }
        : { dateTime: new Date(eventData.start).toISOString() }
      const endProp = eventData.allDay
        ? { date: eventData.end.split('T')[0] }
        : { dateTime: new Date(eventData.end).toISOString() }

      const response = await calendar.events.insert({
        calendarId: calId,
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
      const created: AppCalendarEvent = {
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

      // Add to local cache
      const events = readLocalEvents()
      events.push(created)
      writeLocalEvents(events)
      return created
    } catch (err: any) {
      console.error('[Google Calendar] Errore creazione evento, salvataggio locale:', err?.message || err)
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

  if (calendar && !eventId.startsWith('local_')) {
    try {
      const calId = await resolveCalendarId(calendar)
      const existing = await calendar.events.get({
        calendarId: calId,
        eventId,
      })

      const isAllDay =
        eventData.allDay !== undefined ? eventData.allDay : Boolean(existing.data.start?.date)
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
        calendarId: calId,
        eventId,
        requestBody: {
          summary: eventData.title,
          description: eventData.description,
          location: eventData.location,
          start: startProp,
          end: endProp,
          extendedProperties: {
            private: {
              category:
                eventData.category || existing.data.extendedProperties?.private?.category || 'altro',
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
      const updated: AppCalendarEvent = {
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

      // Update in local cache
      const events = readLocalEvents()
      const index = events.findIndex((e) => e.id === eventId)
      if (index >= 0) {
        events[index] = { ...events[index], ...updated }
      } else {
        events.push(updated)
      }
      writeLocalEvents(events)
      return updated
    } catch (err: any) {
      console.error('[Google Calendar] Errore aggiornamento evento:', err?.message || err)
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

  if (calendar && !eventId.startsWith('local_')) {
    try {
      const calId = await resolveCalendarId(calendar)
      await calendar.events.delete({
        calendarId: calId,
        eventId,
      })
    } catch (err: any) {
      console.error('[Google Calendar] Errore eliminazione evento:', err?.message || err)
    }
  }

  // Remove from local cache
  const events = readLocalEvents()
  const filtered = events.filter((e) => e.id !== eventId)
  if (filtered.length !== events.length) {
    writeLocalEvents(filtered)
    return true
  }

  return false
}
