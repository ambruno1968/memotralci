import type { EventAttachment } from './event.ts'

export type TaskPriority = 'bassa' | 'media' | 'alta' | 'urgente'
export type TaskCategory = 'lavoro' | 'personale' | 'spesa' | 'progetto' | 'altro'

export interface SubtaskItem {
  id: string
  title: string
  completed: boolean
}

export interface AppTaskItem {
  id: string
  title: string
  description?: string
  completed: boolean
  dueDate?: string // YYYY-MM-DD
  priority: TaskPriority
  category?: TaskCategory
  subtasks?: SubtaskItem[]
  attachments?: EventAttachment[]
  calendarEventId?: string // Link to calendar event if created
  createdAt: string
  updatedAt: string
}

export const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; badge: string; color: string; border: string; glow: string }
> = {
  bassa: {
    label: 'Bassa',
    badge: 'bg-slate-100/90 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    color: 'text-slate-500',
    border: 'border-slate-300 dark:border-slate-700',
    glow: '',
  },
  media: {
    label: 'Media',
    badge: 'bg-sky-100/90 text-sky-800 border-sky-300 dark:bg-sky-950/70 dark:text-sky-200 dark:border-sky-800',
    color: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-400 dark:border-sky-700',
    glow: 'shadow-xs shadow-sky-500/10',
  },
  alta: {
    label: 'Alta',
    badge: 'bg-amber-100/90 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800',
    color: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-400 dark:border-amber-700',
    glow: 'shadow-xs shadow-amber-500/15',
  },
  urgente: {
    label: 'Urgente',
    badge: 'bg-rose-100/90 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-800',
    color: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-400 dark:border-rose-700',
    glow: 'shadow-xs shadow-rose-500/20 ring-1 ring-rose-400/40',
  },
}
