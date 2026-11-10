import type { AppCalendarEvent } from '../types/event.ts'

export function exportEventsToIcs(events: AppCalendarEvent[], filename = 'memotralci_calendario.ics') {
  function formatIcsDate(isoString: string, isAllDay: boolean) {
    const d = new Date(isoString)
    if (isAllDay) {
      return d.toISOString().slice(0, 10).replace(/-/g, '')
    }
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MemoTralci//PWA Agenda 1.0//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const evt of events) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${evt.id}@memotralci.app`)
    lines.push(`DTSTAMP:${formatIcsDate(new Date().toISOString(), false)}`)

    if (evt.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(evt.start, true)}`)
      lines.push(`DTEND;VALUE=DATE:${formatIcsDate(evt.end, true)}`)
    } else {
      lines.push(`DTSTART:${formatIcsDate(evt.start, false)}`)
      lines.push(`DTEND:${formatIcsDate(evt.end, false)}`)
    }

    lines.push(`SUMMARY:${evt.title.replace(/\n/g, '\\n')}`)
    if (evt.description) {
      lines.push(`DESCRIPTION:${evt.description.replace(/\n/g, '\\n')}`)
    }
    if (evt.location) {
      lines.push(`LOCATION:${evt.location.replace(/\n/g, '\\n')}`)
    }
    if (evt.category) {
      lines.push(`CATEGORIES:${evt.category.toUpperCase()}`)
    }

    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  const icsContent = lines.join('\r\n')
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
