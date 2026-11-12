import React from 'react'
import {
  X,
  BellRing,
  CalendarDays,
  CheckSquare,
  Clock,
  AlertCircle,
  Sparkles,
  MapPin,
} from 'lucide-react'
import type { AppCalendarEvent } from '../types/event.ts'
import type { AppTaskItem, TaskPriority } from '../types/task.ts'
import { categoryService } from '../services/categoryService.ts'
import {
  format,
  formatDateSafe,
  formatTimeSafe,
  endOfWeek,
  addDays,
} from '../utils/date.ts'

interface UpcomingDeadlinesModalProps {
  isOpen: boolean
  onClose: () => void
  events: AppCalendarEvent[]
  tasks: AppTaskItem[]
  onSelectEvent: (event: AppCalendarEvent) => void
  onSelectTask: (task: AppTaskItem) => void
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgente: 0,
  alta: 1,
  media: 2,
  bassa: 3,
}

const PRIORITY_BADGE: Record<TaskPriority, { label: string; cls: string }> = {
  urgente: {
    label: 'Urgente',
    cls: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
  },
  alta: {
    label: 'Alta',
    cls: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  },
  media: {
    label: 'Media',
    cls: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
  },
  bassa: {
    label: 'Bassa',
    cls: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
}

function extractLocalDateStr(isoOrDate?: string): string {
  if (!isoOrDate) return ''
  if (isoOrDate.length <= 10) return isoOrDate
  return formatDateSafe(isoOrDate, 'yyyy-MM-dd') || isoOrDate.split('T')[0]
}

export function getTomorrowDeadlinesCount(
  events: AppCalendarEvent[],
  tasks: AppTaskItem[]
): number {
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const tomorrowEvents = events.filter((e) => {
    const startStr = extractLocalDateStr(e.start)
    const endStr = extractLocalDateStr(e.end || e.start)
    return startStr === tomorrowStr || (tomorrowStr >= startStr && tomorrowStr <= endStr)
  })
  const tomorrowTasks = tasks.filter((t) => !t.completed && t.dueDate === tomorrowStr)
  return tomorrowEvents.length + tomorrowTasks.length
}

export const UpcomingDeadlinesModal: React.FC<UpcomingDeadlinesModalProps> = ({
  isOpen,
  onClose,
  events,
  tasks,
  onSelectEvent,
  onSelectTask,
}) => {
  if (!isOpen) return null

  const now = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')
  const tomorrowStr = format(addDays(now, 1), 'yyyy-MM-dd')
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const thisWeekEndStr = format(thisWeekEnd, 'yyyy-MM-dd')
  const nextWeekStartStr = format(addDays(thisWeekEnd, 1), 'yyyy-MM-dd')
  const nextWeekEndStr = format(addDays(thisWeekEnd, 7), 'yyyy-MM-dd')

  const pendingTasks = tasks.filter((t) => !t.completed)

  // Helper per raggruppare eventi e task per intervallo date
  function filterEventsInRange(minStr: string, maxStr: string): AppCalendarEvent[] {
    return events
      .filter((e) => {
        const startStr = extractLocalDateStr(e.start)
        const endStr = extractLocalDateStr(e.end || e.start)
        return endStr >= minStr && startStr <= maxStr
      })
      .sort((a, b) => a.start.localeCompare(b.start))
  }

  function filterTasksInRange(minStr: string, maxStr: string): AppTaskItem[] {
    return pendingTasks
      .filter((t) => t.dueDate && t.dueDate >= minStr && t.dueDate <= maxStr)
      .sort((a, b) => {
        const dateCmp = (a.dueDate || '').localeCompare(b.dueDate || '')
        if (dateCmp !== 0) return dateCmp
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      })
  }

  // Eventi e Task di Domani (evidenziati in cima se presenti)
  const tomorrowEvents = filterEventsInRange(tomorrowStr, tomorrowStr)
  const tomorrowTasks = filterTasksInRange(tomorrowStr, tomorrowStr)
  const hasTomorrowItems = tomorrowEvents.length + tomorrowTasks.length > 0

  // Questa settimana (da oggi a domenica corrente)
  const thisWeekEvents = filterEventsInRange(todayStr, thisWeekEndStr)
  const thisWeekTasks = filterTasksInRange(todayStr, thisWeekEndStr)

  // Settimana prossima (da lunedì prossimo a domenica prossima)
  const nextWeekEvents = filterEventsInRange(nextWeekStartStr, nextWeekEndStr)
  const nextWeekTasks = filterTasksInRange(nextWeekStartStr, nextWeekEndStr)

  // Task scaduti (prima di oggi)
  const overdueTasks = pendingTasks
    .filter((t) => t.dueDate && t.dueDate < todayStr)
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))

  // Task senza scadenza (sempre presenti)
  const unscheduledTasks = pendingTasks
    .filter((t) => !t.dueDate)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  const renderEventRow = (evt: AppCalendarEvent, highlight = false) => {
    const startStr = extractLocalDateStr(evt.start)
    const isEvtTomorrow = startStr === tomorrowStr
    const isEvtToday = startStr === todayStr
    const primaryCat =
      Array.isArray(evt.categories) && evt.categories.length > 0
        ? evt.categories[0]
        : evt.category?.split(',')[0]
    const catStyle = categoryService.getCategoryStyle(primaryCat)

    return (
      <button
        key={evt.id}
        type="button"
        onClick={() => {
          onClose()
          onSelectEvent(evt)
        }}
        className={`w-full text-left p-3 rounded-2xl border transition flex items-start justify-between gap-3 cursor-pointer hover:shadow-md ${
          highlight
            ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/80'
            : 'bg-white dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-300'
        }`}
      >
        <div className="flex items-start space-x-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                {evt.title}
              </span>
              {isEvtTomorrow && (
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-500 text-white">
                  Domani
                </span>
              )}
              {isEvtToday && (
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-indigo-600 text-white">
                  Oggi
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              <span className="capitalize">
                {formatDateSafe(startStr, 'EEE d MMM')}
              </span>
              <span>•</span>
              <span>
                {evt.allDay ? 'Tutto il giorno' : formatTimeSafe(evt.start)}
              </span>
              {evt.location && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center space-x-0.5 truncate max-w-[160px]">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{evt.location}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {primaryCat && (
          <span
            className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border shrink-0 ${catStyle.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
            <span>{catStyle.label}</span>
          </span>
        )}
      </button>
    )
  }

  const renderTaskRow = (task: AppTaskItem, highlight = false, isOverdue = false) => {
    const pConf = PRIORITY_BADGE[task.priority]
    const isTaskTomorrow = task.dueDate === tomorrowStr
    const isTaskToday = task.dueDate === todayStr

    return (
      <button
        key={task.id}
        type="button"
        onClick={() => {
          onClose()
          onSelectTask(task)
        }}
        className={`w-full text-left p-3 rounded-2xl border transition flex items-start justify-between gap-3 cursor-pointer hover:shadow-md ${
          isOverdue
            ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
            : highlight
            ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/80'
            : 'bg-white dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/80 hover:border-emerald-300'
        }`}
      >
        <div className="flex items-start space-x-2.5 min-w-0">
          <div
            className={`p-2 rounded-xl shrink-0 mt-0.5 ${
              isOverdue
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                {task.title}
              </span>
              {isOverdue && (
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-rose-600 text-white">
                  Scaduto
                </span>
              )}
              {isTaskTomorrow && (
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-500 text-white">
                  Domani
                </span>
              )}
              {isTaskToday && (
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-600 text-white">
                  Oggi
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium capitalize">
              {task.dueDate
                ? `Scadenza: ${formatDateSafe(task.dueDate, 'EEE d MMM yyyy')}`
                : 'Senza data di scadenza'}
            </p>
          </div>
        </div>

        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border shrink-0 ${pConf.cls}`}>
          {pConf.label}
        </span>
      </button>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/65 backdrop-blur-md animate-in fade-in duration-150 safe-top safe-bottom"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[88dvh] sm:max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-white/60 dark:border-slate-800 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-50/70 via-white to-indigo-50/60 dark:from-slate-800/80 dark:to-slate-800/50 shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25 shrink-0">
              <BellRing className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                Scadenze & Impegni Imminenti
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                Questa settimana, settimana prossima e task senza scadenza
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50 dark:bg-slate-950/30">
          {/* Sezione Domani (se presenti) */}
          {hasTomorrowItems && (
            <section className="space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>In programma per Domani ({tomorrowEvents.length + tomorrowTasks.length})</span>
              </div>
              <div className="space-y-2">
                {tomorrowEvents.map((e) => renderEventRow(e, true))}
                {tomorrowTasks.map((t) => renderTaskRow(t, true))}
              </div>
            </section>
          )}

          {/* Task scaduti */}
          {overdueTasks.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Task scaduti da completare ({overdueTasks.length})</span>
              </div>
              <div className="space-y-2">
                {overdueTasks.map((t) => renderTaskRow(t, false, true))}
              </div>
            </section>
          )}

          {/* Questa Settimana */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Questa Settimana ({thisWeekEvents.length + thisWeekTasks.length})</span>
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">
                fino a {formatDateSafe(thisWeekEndStr, 'd MMM')}
              </span>
            </div>
            {thisWeekEvents.length + thisWeekTasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-white/70 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                Nessun impegno o scadenza per il resto di questa settimana.
              </p>
            ) : (
              <div className="space-y-2">
                {thisWeekEvents.map((e) => renderEventRow(e))}
                {thisWeekTasks.map((t) => renderTaskRow(t))}
              </div>
            )}
          </section>

          {/* Settimana Prossima */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-400">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Settimana Prossima ({nextWeekEvents.length + nextWeekTasks.length})</span>
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">
                {formatDateSafe(nextWeekStartStr, 'd MMM')} – {formatDateSafe(nextWeekEndStr, 'd MMM')}
              </span>
            </div>
            {nextWeekEvents.length + nextWeekTasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-white/70 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                Nessun impegno o scadenza programmata per la prossima settimana.
              </p>
            ) : (
              <div className="space-y-2">
                {nextWeekEvents.map((e) => renderEventRow(e))}
                {nextWeekTasks.map((t) => renderTaskRow(t))}
              </div>
            )}
          </section>

          {/* Task senza scadenza (sempre presenti) */}
          <section className="space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Task senza scadenza ({unscheduledTasks.length})</span>
            </div>
            {unscheduledTasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-white/70 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                Nessun task senza scadenza in sospeso.
              </p>
            ) : (
              <div className="space-y-2">
                {unscheduledTasks.map((t) => renderTaskRow(t))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Tocca una voce per aprirla o modificarla
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-black text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl shadow-md transition cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}

