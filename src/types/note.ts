export type NoteColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'orange'

export interface AppNoteItem {
  id: string
  title?: string
  content: string
  color?: NoteColor
  pinned?: boolean
  category?: string
  categories?: string[]
  createdAt: string
  updatedAt: string
}

export function normalizeNoteCategories(note?: AppNoteItem | null): string[] {
  if (!note) return []
  if (Array.isArray(note.categories) && note.categories.length > 0) {
    return note.categories.filter((c) => c && c.trim().toLowerCase() !== 'altro')
  }
  if (typeof note.category === 'string' && note.category.trim()) {
    return note.category
      .split(',')
      .map((s) => s.trim())
      .filter((c) => Boolean(c) && c.toLowerCase() !== 'altro')
  }
  return []
}

export const NOTE_COLORS: Record<
  NoteColor,
  {
    label: string
    card: string
    border: string
    pin: string
    dot: string
    fold: string
  }
> = {
  yellow: {
    label: 'Giallo',
    card: 'bg-amber-100/95 dark:bg-amber-950/65 text-amber-950 dark:text-amber-100',
    border: 'border-amber-300/90 dark:border-amber-700/70',
    pin: 'text-amber-600 dark:text-amber-300',
    dot: 'bg-amber-400',
    fold: 'border-t-amber-300/90 dark:border-t-amber-700/80',
  },
  pink: {
    label: 'Rosa',
    card: 'bg-rose-100/95 dark:bg-rose-950/65 text-rose-950 dark:text-rose-100',
    border: 'border-rose-300/90 dark:border-rose-700/70',
    pin: 'text-rose-600 dark:text-rose-300',
    dot: 'bg-rose-400',
    fold: 'border-t-rose-300/90 dark:border-t-rose-700/80',
  },
  blue: {
    label: 'Azzurro',
    card: 'bg-sky-100/95 dark:bg-sky-950/65 text-sky-950 dark:text-sky-100',
    border: 'border-sky-300/90 dark:border-sky-700/70',
    pin: 'text-sky-600 dark:text-sky-300',
    dot: 'bg-sky-400',
    fold: 'border-t-sky-300/90 dark:border-t-sky-700/80',
  },
  green: {
    label: 'Verde',
    card: 'bg-emerald-100/95 dark:bg-emerald-950/65 text-emerald-950 dark:text-emerald-100',
    border: 'border-emerald-300/90 dark:border-emerald-700/70',
    pin: 'text-emerald-600 dark:text-emerald-300',
    dot: 'bg-emerald-400',
    fold: 'border-t-emerald-300/90 dark:border-t-emerald-700/80',
  },
  purple: {
    label: 'Viola',
    card: 'bg-purple-100/95 dark:bg-purple-950/65 text-purple-950 dark:text-purple-100',
    border: 'border-purple-300/90 dark:border-purple-700/70',
    pin: 'text-purple-600 dark:text-purple-300',
    dot: 'bg-purple-400',
    fold: 'border-t-purple-300/90 dark:border-t-purple-700/80',
  },
  orange: {
    label: 'Arancio',
    card: 'bg-orange-100/95 dark:bg-orange-950/65 text-orange-950 dark:text-orange-100',
    border: 'border-orange-300/90 dark:border-orange-700/70',
    pin: 'text-orange-600 dark:text-orange-300',
    dot: 'bg-orange-400',
    fold: 'border-t-orange-300/90 dark:border-t-orange-700/80',
  },
}

