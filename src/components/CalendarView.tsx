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
  Download,
} from 'lucide-react'
import type { AppCalendarEvent, EventCategory } from '../types/event.ts'
import { CATEGORY_COLORS } from '../types/event.ts'
import type { AppTaskItem } from '../types/task.ts'
import { exportEventsToIcs } from '../utils/ics.ts'
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

type CalendarMode = 'month' | 'week' | 'agenda'

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  tasks,
  onOpenEventModal,
  onOpenTaskModal,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [mode, setMode] = useState<CalendarMode>('month')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Navigation
  function handlePrev() {
    if (mode === 'month') setCurrentDate((d) => subMonths(d, 1))
    else if (mode === 'week') setCurrentDate((d) => subDays(d, 7))
    else setCurrentDate((d) => subMonths(d, 1))
  }

  function handleNext() {
    if (mode === 'month') setCurrentDate((d) => addMonths(d, 1))
    else if (mode === 'week') setCurrentDate((d) => addDays(d, 7))
    else setCurrentDate((d) => addMonths(d, 1))
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
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const monthDays = eachDayOfInterval({ start: gridStart, end: gridEnd })

  // Days for Week view
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  function getEventsOnDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return filteredEvents.filter((e) => {
      const eventStartStr = e.start.split('T')[0]
      return eventStartStr === dateStr
    })
  }

  function getTasksOnDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return tasks.filter((t) => t.dueDate === dateStr)
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-12">
      {/* Calendar Header Card */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-white/80 dark:border-slate-800 shadow-xl shadow-indigo-950/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Navigation & Month Title */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={handleToday}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition shadow-2xs"
            >
              Oggi
            </button>

            <div className="flex items-center space-x-1">
              <button
                onClick={handlePrev}
                className="p-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 transition"
                title="Mese precedente"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 transition"
                title="Mese successivo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white capitalize pl-1">
              {format(currentDate, 'MMMM yyyy', { locale: it })}
            </h2>
          </div>

          {/* Controls: Mode Switcher & Actions */}
          <div className="flex items-center space-x-2">
            {/* View Mode Switcher */}
            <div className="flex items-center space-x-1 bg-slate-100/80 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
              <button
                onClick={() => setMode('month')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
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
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
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
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  mode === 'agenda'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Agenda</span>
              </button>
            </div>

            {/* ICS Export button */}
            {events.length > 0 && (
              <button
                onClick={() => exportEventsToIcs(events)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                title="Esporta calendario in formato standard .ics (Apple/Outlook/Google)"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            {/* New Event Button */}
            <button
              onClick={() => onOpenEventModal(undefined, format(currentDate, 'yyyy-MM-dd'))}
              className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-indigo-500/25 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuovo Evento</span>
            </button>
          </div>
        </div>

        {/* Category Filter Chips Bar */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
            Filtra:
          </span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Tutti ({events.length})
          </button>
          {(Object.keys(CATEGORY_COLORS) as EventCategory[]).map((cat) => {
            const conf = CATEGORY_COLORS[cat]
            const isSelected = selectedCategory === cat
            const count = events.filter((e) => e.category === cat).length
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(isSelected ? 'all' : cat)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap border transition ${
                  isSelected
                    ? `${conf.bg} ${conf.text} ${conf.border} ring-2 ring-indigo-500 shadow-xs font-bold`
                    : 'bg-white/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${conf.dot}`} />
                <span>{conf.label}</span>
                {count > 0 && <span className="opacity-70 text-[10px]">({count})</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* 1. MONTH VIEW */}
      {mode === 'month' && (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl border border-white/80 dark:border-slate-800 shadow-xl shadow-indigo-950/5 overflow-hidden">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-slate-50/90 via-indigo-50/30 to-slate-50/90 dark:from-slate-800/60 dark:to-slate-800/60 text-center py-3">
            {['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'].map(
              (day, idx) => (
                <span
                  key={day}
                  className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  <span className="hidden md:inline">{day}</span>
                  <span className="md:hidden">{['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'][idx]}</span>
                </span>
              )
            )}
          </div>

          {/* Month Day Cells */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100/90 dark:divide-slate-800/60 border-b border-slate-100 dark:border-slate-800">
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
                  className={`min-h-[110px] sm:min-h-[135px] p-1.5 sm:p-2.5 transition group flex flex-col justify-between hover:bg-indigo-50/30 dark:hover:bg-slate-800/40 cursor-pointer ${
                    !isCurrMonth ? 'bg-slate-50/30 dark:bg-slate-950/40 opacity-40' : ''
                  }`}
                >
                  {/* Top cell row */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-xl transition ${
                        isDayToday
                          ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30 ring-2 ring-indigo-300 dark:ring-indigo-700'
                          : 'text-slate-700 dark:text-slate-300 group-hover:text-indigo-600'
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
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
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
                          className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border truncate transition hover:scale-[1.02] shadow-2xs ${conf.bg} ${conf.text} ${conf.border}`}
                          title={evt.title}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${conf.dot} shrink-0`} />
                          <span className="truncate flex-1">
                            {!evt.allDay && formatTimeSafe(evt.start)} {evt.title}
                          </span>
                          {hasAttachments && (
                            <Paperclip className="w-2.5 h-2.5 shrink-0 opacity-80" />
                          )}
                        </div>
                      )
                    })}

                    {/* Task due badge */}
                    {dayTasks.slice(0, 1).map((task) => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenTaskModal(task)
                        }}
                        className="flex items-center space-x-1 px-1.5 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 truncate"
                        title={`Task: ${task.title}`}
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                        <span className="truncate flex-1">{task.title}</span>
                      </div>
                    ))}

                    {dayEvents.length > 3 && (
                      <p className="text-[9px] font-black text-indigo-500 pl-1">
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
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl border border-white/80 dark:border-slate-800 shadow-xl shadow-indigo-950/5 overflow-hidden">
          <div className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800">
            {weekDays.map((day) => {
              const dayEvents = getEventsOnDay(day)
              const dayTasks = getTasksOnDay(day)
              const isDayToday = isToday(day)
              const dateStr = format(day, 'yyyy-MM-dd')

              return (
                <div key={day.toISOString()} className="min-h-[480px] flex flex-col">
                  {/* Header */}
                  <div
                    className={`p-3 text-center border-b border-slate-100 dark:border-slate-800 ${
                      isDayToday
                        ? 'bg-gradient-to-b from-indigo-50 to-indigo-100/50 dark:from-indigo-950/60 dark:to-indigo-900/40'
                        : 'bg-slate-50/50'
                    }`}
                  >
                    <p className="text-[11px] font-bold uppercase text-slate-400">
                      {format(day, 'EEE', { locale: it })}
                    </p>
                    <span
                      className={`inline-block mt-0.5 text-sm font-black w-8 h-8 leading-8 rounded-xl ${
                        isDayToday
                          ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Events list in day column */}
                  <div
                    onClick={() => onOpenEventModal(undefined, dateStr)}
                    className="flex-1 p-2 space-y-2 hover:bg-indigo-50/20 dark:hover:bg-slate-800/20 cursor-pointer"
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
                          className={`p-2.5 rounded-2xl text-xs font-semibold border shadow-xs transition hover:scale-[1.02] ${conf.bg} ${conf.text} ${conf.border}`}
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
                            <p className="text-[10px] opacity-80 truncate flex items-center space-x-0.5 mt-1">
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
                        className="p-2 rounded-xl text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      >
                        <span className="flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
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
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-16 bg-white/90 dark:bg-slate-900/90 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8 shadow-sm">
              <CalendarIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                Nessun evento in agenda
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Aggiungi un nuovo evento con allegati sincronizzati sul Google Calendar.
              </p>
            </div>
          ) : (
            filteredEvents.map((evt) => {
              const cat = evt.category || 'lavoro'
              const conf = CATEGORY_COLORS[cat]
              const hasAttachments = Boolean(evt.attachments && evt.attachments.length > 0)

              return (
                <div
                  key={evt.id}
                  onClick={() => onOpenEventModal(evt)}
                  className={`p-4 sm:p-5 rounded-3xl bg-white/95 dark:bg-slate-900/95 border ${conf.border} hover:border-indigo-400 shadow-md hover:shadow-xl transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                >
                  <div className="flex items-start space-x-3.5">
                    <div
                      className={`p-3 rounded-2xl ${conf.bg} ${conf.text} ${conf.border} border shadow-xs shrink-0`}
                    >
                      <CalendarIcon className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${conf.badge}`}
                        >
                          {conf.label}
                        </span>
                        {hasAttachments && (
                          <span className="flex items-center space-x-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg">
                            <Paperclip className="w-3 h-3" />
                            <span>{evt.attachments!.length} allegati</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
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
                      <p className="text-slate-900 dark:text-white font-black text-sm">
                        {formatDateSafe(evt.start, 'd MMMM yyyy')}
                      </p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                        {evt.allDay
                          ? 'Tutto il giorno'
                          : `${formatTimeSafe(evt.start)} - ${formatTimeSafe(evt.end)}`}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
