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
  { label: string; badge: string; color: string; border: string }
> = {
  bassa: {
    label: 'Bassa',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    color: 'text-slate-500',
    border: 'border-slate-300',
  },
  media: {
    label: 'Media',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    color: 'text-blue-500',
    border: 'border-blue-400',
  },
  alta: {
    label: 'Alta',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    color: 'text-amber-500',
    border: 'border-amber-400',
  },
  urgente: {
    label: 'Urgente',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
    color: 'text-rose-500',
    border: 'border-rose-500',
  },
}
