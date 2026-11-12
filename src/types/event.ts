export type EventCategory = string

export interface EventAttachment {
  id: string
  name: string
  mimeType: string
  size: number
  url?: string
  webViewLink?: string
  webContentLink?: string
  isLocal?: boolean
}

export interface AppCalendarEvent {
  id: string
  title: string
  description?: string
  location?: string
  start: string // ISO string or YYYY-MM-DD
  end: string // ISO string or YYYY-MM-DD
  allDay: boolean
  category?: EventCategory
  categories?: string[]
  color?: string
  attachments?: EventAttachment[]
  googleEventId?: string
  calendarId?: string
}

export const CATEGORY_COLORS: Record<
  EventCategory,
  {
    bg: string
    text: string
    border: string
    dot: string
    label: string
    badge: string
    cardGradient: string
  }
> = {
  lavoro: {
    bg: 'bg-indigo-50/90 dark:bg-indigo-950/60',
    text: 'text-indigo-800 dark:text-indigo-200',
    border: 'border-indigo-300 dark:border-indigo-700/80',
    dot: 'bg-indigo-600 dark:bg-indigo-400',
    label: 'Lavoro',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/60 dark:text-indigo-200',
    cardGradient: 'from-indigo-500/10 to-indigo-600/5',
  },
  personale: {
    bg: 'bg-emerald-50/90 dark:bg-emerald-950/60',
    text: 'text-emerald-800 dark:text-emerald-200',
    border: 'border-emerald-300 dark:border-emerald-700/80',
    dot: 'bg-emerald-600 dark:bg-emerald-400',
    label: 'Personale',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-200',
    cardGradient: 'from-emerald-500/10 to-teal-600/5',
  },
  riunione: {
    bg: 'bg-purple-50/90 dark:bg-purple-950/60',
    text: 'text-purple-800 dark:text-purple-200',
    border: 'border-purple-300 dark:border-purple-700/80',
    dot: 'bg-purple-600 dark:bg-purple-400',
    label: 'Riunione',
    badge: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/60 dark:text-purple-200',
    cardGradient: 'from-purple-500/10 to-fuchsia-600/5',
  },
  urgente: {
    bg: 'bg-rose-50/90 dark:bg-rose-950/60',
    text: 'text-rose-800 dark:text-rose-200',
    border: 'border-rose-300 dark:border-rose-700/80',
    dot: 'bg-rose-600 dark:bg-rose-400',
    label: 'Urgente',
    badge: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/60 dark:text-rose-200',
    cardGradient: 'from-rose-500/15 to-orange-500/5',
  },
  spesa: {
    bg: 'bg-amber-50/90 dark:bg-amber-950/60',
    text: 'text-amber-800 dark:text-amber-200',
    border: 'border-amber-300 dark:border-amber-700/80',
    dot: 'bg-amber-500 dark:bg-amber-400',
    label: 'Spesa & Acquisti',
    badge: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/60 dark:text-amber-200',
    cardGradient: 'from-amber-500/10 to-yellow-600/5',
  },
  altro: {
    bg: 'bg-cyan-50/90 dark:bg-cyan-950/60',
    text: 'text-cyan-800 dark:text-cyan-200',
    border: 'border-cyan-300 dark:border-cyan-700/80',
    dot: 'bg-cyan-500 dark:bg-cyan-400',
    label: 'Altro',
    badge: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/60 dark:text-cyan-200',
    cardGradient: 'from-cyan-500/10 to-sky-600/5',
  },
}
