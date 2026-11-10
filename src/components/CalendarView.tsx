import React, { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Paperclip,
  MapPin,
  CheckCircle2,
  CalendarDays,
  List,
  Columns3,
} from 'lucide-react'
import type { AppCalendarEvent } from '../types/event.ts'
import { CATEGORY_COLORS } from '../types/event.ts'
import type { AppTaskItem } from '../types/task.ts'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  addDays,
  subDays,
  formatDateSafe,
  formatTimeSafe,
  format,
  it,
} from '../utils/date.ts'

interface CalendarViewProps {
  events: AppCalendarEvent[]
  tasks: AppTaskItem[]
  onOpenEventModal: (event?: AppCalendarEvent, initialDate?: string) => void
  onOpenTaskModal: (task?: AppTaskItem) => void
}

type CalendarMode = 'month' | 'week' | 'day' | 'agenda'

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  tasks,
  onOpenEventModal,
  onOpenTaskModal,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [mode, setMode] = useState<CalendarMode>('month')
  const [selectedCategory] = useState<string>('all')

  // Month navigation
  function handlePrev() {
    if (mode === 'month') setCurrentDate((d) => subMonths(d, 1))
    else if (mode === 'week') setCurrentDate((d) => subDays(d, 7))
    else if (mode === 'day') setCurrentDate((d) => subDays(d, 1))
  }

  function handleNext() {
    if (mode === 'month') setCurrentDate((d) => addMonths(d, 1))
    else if (mode === 'week') setCurrentDate((d) => addDays(d, 7))
    else if (mode === 'day') setCurrentDate((d) => addDays(d, 1))
  }

  function handleToday() {
    setCurrentDate(new Date())
  }

  // Filter events by category
  const filteredEvents = events.filter((e) => {
    if (selectedCategory !== 'all' && e.category !== selectedCategory) return false
    return true
  })

  // Days for Month grid
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday start
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const monthDays = eachDayOfInterval({ start: gridStart, end: gridEnd })

  // Days for Week view
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Helper to find events on day
  function getEventsOnDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return filteredEvents.filter((e) => {
      const eventStartStr = e.start.split('T')[0]
      return eventStartStr === dateStr
    })
  }

  // Helper to find tasks due on day
  function getTasksOnDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return tasks.filter((t) => t.dueDate === dateStr)
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-12">
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Navigation & Title */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleToday}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition"
          >
            Oggi
          </button>

          <div className="flex items-center space-x-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 transition"
              title="Precedente"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 transition"
              title="Successivo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white capitalize pl-2">
            {format(currentDate, 'MMMM yyyy', { locale: it })}
          </h2>
        </div>

        {/* View mode switcher & Action */}
        <div className="flex items-center space-x-2">
          {/* Mode Switcher */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setMode('month')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                mode === 'month'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mese</span>
            </button>
            <button
              onClick={() => setMode('week')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                mode === 'week'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Settimana</span>
            </button>
            <button
              onClick={() => setMode('agenda')}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                mode === 'agenda'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Agenda</span>
            </button>
          </div>

          {/* New Event Button */}
          <button
            onClick={() => onOpenEventModal(undefined, format(currentDate, 'yyyy-MM-dd'))}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuovo Evento</span>
          </button>
        </div>
      </div>

      {/* 1. MONTH VIEW */}
      {mode === 'month' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-center py-2.5">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day) => (
              <span
                key={day}
                className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                {day}
              </span>
            ))}
          </div>

          {/* Month Day Cells */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/70 border-b border-slate-100 dark:border-slate-800">
            {monthDays.map((day) => {
              const dayEvents = getEventsOnDay(day)
              const dayTasks = getTasksOnDay(day)
              const isCurrMonth = isSameMonth(day, currentDate)
              const isDayToday = isToday(day)
              const dateStr = format(day, 'yyyy-MM-dd')

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => onOpenEventModal(undefined, dateStr)}
                  className={`min-h-[105px] sm:min-h-[125px] p-1.5 sm:p-2 transition group flex flex-col justify-between hover:bg-indigo-50/20 dark:hover:bg-slate-800/40 cursor-pointer ${
                    !isCurrMonth ? 'bg-slate-50/40 dark:bg-slate-950/30 opacity-40' : ''
                  }`}
                >
                  {/* Top cell row */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isDayToday
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenEventModal(undefined, dateStr)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition"
                      title="Aggiungi evento qui"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Badges container */}
                  <div className="flex-1 space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((evt) => {
                      const cat = evt.category || 'lavoro'
                      const conf = CATEGORY_COLORS[cat]
                      const hasAttachments = Boolean(evt.attachments && evt.attachments.length > 0)

                      return (
                        <div
                          key={evt.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenEventModal(evt)
                          }}
                          className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border truncate transition hover:scale-[1.02] ${conf.bg} ${conf.text} ${conf.border}`}
                          title={evt.title}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${conf.dot} shrink-0`} />
                          <span className="truncate flex-1">
                            {!evt.allDay && formatTimeSafe(evt.start)} {evt.title}
                          </span>
                          {hasAttachments && (
                            <Paperclip className="w-2.5 h-2.5 shrink-0 opacity-70" />
                          )}
                        </div>
                      )
                    })}

                    {dayTasks.slice(0, 1).map((task) => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenTaskModal(task)
                        }}
                        className="flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 truncate"
                        title={`Task: ${task.title}`}
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                        <span className="truncate flex-1">{task.title}</span>
                      </div>
                    ))}

                    {dayEvents.length > 3 && (
                      <p className="text-[9px] font-bold text-slate-400 pl-1">
                        +{dayEvents.length - 3} altri
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 2. WEEK VIEW */}
      {mode === 'week' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800">
            {weekDays.map((day) => {
              const dayEvents = getEventsOnDay(day)
              const dayTasks = getTasksOnDay(day)
              const isDayToday = isToday(day)
              const dateStr = format(day, 'yyyy-MM-dd')

              return (
                <div key={day.toISOString()} className="min-h-[450px] flex flex-col">
                  {/* Header */}
                  <div
                    className={`p-3 text-center border-b border-slate-100 dark:border-slate-800 ${
                      isDayToday ? 'bg-indigo-50/60 dark:bg-indigo-950/40' : 'bg-slate-50/50'
                    }`}
                  >
                    <p className="text-[11px] font-bold uppercase text-slate-400">
                      {format(day, 'EEE', { locale: it })}
                    </p>
                    <span
                      className={`inline-block mt-0.5 text-sm font-bold w-7 h-7 leading-7 rounded-full ${
                        isDayToday
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Events list in day column */}
                  <div
                    onClick={() => onOpenEventModal(undefined, dateStr)}
                    className="flex-1 p-2 space-y-2 hover:bg-slate-50/40 dark:hover:bg-slate-800/20 cursor-pointer"
                  >
                    {dayEvents.map((evt) => {
                      const cat = evt.category || 'lavoro'
                      const conf = CATEGORY_COLORS[cat]
                      return (
                        <div
                          key={evt.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenEventModal(evt)
                          }}
                          className={`p-2 rounded-xl text-xs font-semibold border shadow-xs transition hover:scale-[1.02] ${conf.bg} ${conf.text} ${conf.border}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold">
                              {evt.allDay ? 'Tutto il giorno' : formatTimeSafe(evt.start)}
                            </span>
                            {evt.attachments && evt.attachments.length > 0 && (
                              <Paperclip className="w-3 h-3 text-slate-500" />
                            )}
                          </div>
                          <p className="font-bold line-clamp-2">{evt.title}</p>
                          {evt.location && (
                            <p className="text-[10px] opacity-75 truncate flex items-center space-x-0.5 mt-0.5">
                              <MapPin className="w-2.5 h-2.5" />
                              <span>{evt.location}</span>
                            </p>
                          )}
                        </div>
                      )
                    })}

                    {dayTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenTaskModal(t)
                        }}
                        className="p-1.5 rounded-xl text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      >
                        <span className="flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="truncate">{t.title}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 3. AGENDA / STREAM VIEW */}
      {mode === 'agenda' && (
        <div className="space-y-4">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8">
              <CalendarIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
                Nessun evento in agenda
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Aggiungi un nuovo evento con allegati sincronizzati sul Google Calendar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((evt) => {
                const cat = evt.category || 'lavoro'
                const conf = CATEGORY_COLORS[cat]
                const hasAttachments = Boolean(evt.attachments && evt.attachments.length > 0)

                return (
                  <div
                    key={evt.id}
                    onClick={() => onOpenEventModal(evt)}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start space-x-3.5">
                      <div
                        className={`p-2.5 rounded-2xl ${conf.bg} ${conf.text} ${conf.border} border shrink-0`}
                      >
                        <CalendarIcon className="w-5 h-5" />
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${conf.bg} ${conf.text}`}
                          >
                            {conf.label}
                          </span>
                          {hasAttachments && (
                            <span className="flex items-center space-x-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">
                              <Paperclip className="w-3 h-3" />
                              <span>{evt.attachments!.length} allegati</span>
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                          {evt.title}
                        </h4>

                        {evt.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {evt.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-xs font-semibold text-slate-600 dark:text-slate-300 sm:text-right shrink-0">
                      <div>
                        <p className="text-slate-900 dark:text-white font-bold">
                          {formatDateSafe(evt.start, 'd MMMM yyyy')}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {evt.allDay
                            ? 'Tutto il giorno'
                            : `${formatTimeSafe(evt.start)} - ${formatTimeSafe(evt.end)}`}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
