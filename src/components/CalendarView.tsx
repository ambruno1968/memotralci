import React, { useState, useEffect } from 'react'
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
  Sparkles,
  Share2,
  Clock,
  SunMedium,
} from 'lucide-react'
import appLogo from '../assets/logo-icon.png'
import type { AppCalendarEvent } from '../types/event.ts'
import { categoryService, type AppCategoryItem, normalizeCategories } from '../services/categoryService.ts'
import type { AppTaskItem } from '../types/task.ts'
import { exportEventsToIcs } from '../utils/ics.ts'
import { ShareEventModal } from './ShareEventModal.tsx'
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

type CalendarMode = 'day' | 'month' | 'week' | 'agenda'

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  tasks,
  onOpenEventModal,
  onOpenTaskModal,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [mode, setMode] = useState<CalendarMode>('month')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categories, setCategories] = useState<AppCategoryItem[]>(categoryService.getCategories())

  // Stato per il modale di condivisione elegante (singolo evento o intera giornata)
  const [shareTarget, setShareTarget] = useState<{
    event?: AppCalendarEvent | null
    dayEvents?: AppCalendarEvent[]
    dayDate?: Date
  } | null>(null)

  useEffect(() => {
    return categoryService.subscribe(setCategories)
  }, [])

  // Navigation in base alla vista attiva (Giorno, Settimana, Mese, Agenda)
  function handlePrev() {
    if (mode === 'day') setCurrentDate((d) => subDays(d, 1))
    else if (mode === 'week') setCurrentDate((d) => subDays(d, 7))
    else setCurrentDate((d) => subMonths(d, 1))
  }

  function handleNext() {
    if (mode === 'day') setCurrentDate((d) => addDays(d, 1))
    else if (mode === 'week') setCurrentDate((d) => addDays(d, 7))
    else setCurrentDate((d) => addMonths(d, 1))
  }

  // Cliccando su "Oggi" si posiziona sulla data odierna e apre la vista del solo giorno (Oggi)
  function handleToday() {
    setCurrentDate(new Date())
    setMode('day')
  }

  // Filter events by category
  const filteredEvents = events.filter((e) => {
    if (selectedCategory !== 'all') {
      const evtCats = normalizeCategories(e)
      if (selectedCategory === 'none') {
        if (evtCats.length > 0) return false
      } else {
        if (!evtCats.includes(selectedCategory)) return false
      }
    }
    return true
  })

  // Eventi per l'Agenda: solo da OGGI in poi (nasconde gli eventi passati)
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const upcomingAgendaEvents = filteredEvents
    .filter((e) => {
      const startDay = e.start.split('T')[0]
      const endDay = (e.end || e.start).split('T')[0]
      return startDay >= todayStr || endDay >= todayStr
    })
    .sort((a, b) => a.start.localeCompare(b.start))

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
    return filteredEvents
      .filter((e) => {
        const eventStartStr = e.start.split('T')[0]
        const eventEndStr = (e.end || e.start).split('T')[0]
        return eventStartStr === dateStr || (dateStr >= eventStartStr && dateStr <= eventEndStr)
      })
      .sort((a, b) => a.start.localeCompare(b.start))
  }

  function getTasksOnDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return tasks.filter((t) => t.dueDate === dateStr)
  }

  // Eventi e Task per la vista del singolo giorno selezionato
  const selectedDayEvents = getEventsOnDay(currentDate)
  const selectedDayTasks = getTasksOnDay(currentDate)
  const isCurrentDateToday = isToday(currentDate)

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* VIBRANT TOP HERO BANNER CON ILLUSTRAZIONE CALENDARIO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 sm:p-8 text-white shadow-2xl shadow-indigo-950/20 border border-white/20">
        {/* Background decorative elements */}
        <div className="absolute -right-8 -bottom-8 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-12 top-4 w-40 h-40 rounded-full bg-amber-400/20 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black tracking-wider uppercase flex items-center space-x-1 border border-white/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Agenda & Calendario Google</span>
              </span>
              <span className="text-xs font-bold text-indigo-100 capitalize">
                {format(new Date(), 'EEEE d MMMM', { locale: it })}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight capitalize text-white drop-shadow-xs">
              {mode === 'day'
                ? format(currentDate, 'EEEE d MMMM yyyy', { locale: it })
                : format(currentDate, 'MMMM yyyy', { locale: it })}
            </h1>

            <p className="text-xs sm:text-sm text-indigo-100 font-medium max-w-md">
              {upcomingAgendaEvents.length} prossimi eventi • {tasks.filter((t) => !t.completed).length} attività da completare • sincronizzazione attiva
            </p>
          </div>

          {/* Quick Actions in Hero */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onOpenEventModal(undefined, format(currentDate, 'yyyy-MM-dd'))}
              className="flex items-center space-x-2 px-5 py-3 bg-white text-indigo-900 hover:bg-indigo-50 rounded-2xl font-black text-xs shadow-xl transition cursor-pointer transform hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Nuovo Evento</span>
            </button>

            {events.length > 0 && (
              <button
                onClick={() => exportEventsToIcs(events)}
                className="flex items-center space-x-1.5 px-4 py-3 bg-white/15 hover:bg-white/25 backdrop-blur-md text-white rounded-2xl font-bold text-xs border border-white/30 transition cursor-pointer"
                title="Esporta calendario in formato standard .ics"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Esporta .ics</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Controls Card */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-white/80 dark:border-slate-800 shadow-xl shadow-indigo-950/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Navigation Oggi / Prev / Next */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleToday}
              className={`px-4 py-2 rounded-2xl border text-xs font-black transition shadow-xs cursor-pointer flex items-center space-x-1.5 ${
                mode === 'day' && isCurrentDateToday
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                  : 'bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 dark:from-slate-800 dark:to-slate-800 border-indigo-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-300'
              }`}
              title="Visualizza il programma di Oggi"
            >
              <SunMedium className="w-3.5 h-3.5" />
              <span>Oggi</span>
            </button>

            <div className="flex items-center space-x-1 bg-slate-100/80 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={handlePrev}
                className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title={mode === 'day' ? 'Giorno precedente' : mode === 'week' ? 'Settimana precedente' : 'Mese precedente'}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title={mode === 'day' ? 'Giorno successivo' : mode === 'week' ? 'Settimana successiva' : 'Mese successivo'}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <span className="text-sm sm:text-lg font-black text-slate-800 dark:text-white capitalize pl-1">
              {mode === 'day'
                ? format(currentDate, 'EEEE d MMMM yyyy', { locale: it })
                : format(currentDate, 'MMMM yyyy', { locale: it })}
            </span>
          </div>

          {/* View Mode Switcher (Giorno, Mese, Settimana, Agenda) */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-inner">
            <button
              onClick={() => setMode('day')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                mode === 'day'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <SunMedium className="w-3.5 h-3.5" />
              <span>Giorno</span>
            </button>
            <button
              onClick={() => setMode('month')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                mode === 'month'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Mese</span>
            </button>
            <button
              onClick={() => setMode('week')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                mode === 'week'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Settimana</span>
            </button>
            <button
              onClick={() => setMode('agenda')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                mode === 'agenda'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Agenda</span>
            </button>
          </div>
        </div>

        {/* Category Filter Chips Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider mr-1 shrink-0">
            Categorie:
          </span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Tutti ({events.length})
          </button>
          {(() => {
            const uncategorizedCount = events.filter((e) => normalizeCategories(e).length === 0).length
            if (uncategorizedCount === 0) return null
            const isSelected = selectedCategory === 'none'
            return (
              <button
                onClick={() => setSelectedCategory(isSelected ? 'all' : 'none')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-black whitespace-nowrap border transition cursor-pointer ${
                  isSelected
                    ? 'bg-slate-700 text-white border-slate-600 ring-2 ring-slate-400 shadow-sm'
                    : 'bg-white/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 ring-2 ring-white/50" />
                <span>Senza categoria</span>
                <span className="opacity-75 text-[10px]">({uncategorizedCount})</span>
              </button>
            )
          })()}
          {categories.map((catItem) => {
            const conf = categoryService.getCategoryStyle(catItem.id)
            const isSelected = selectedCategory === catItem.id
            const count = events.filter((e) => normalizeCategories(e).includes(catItem.id)).length
            return (
              <button
                key={catItem.id}
                onClick={() => setSelectedCategory(isSelected ? 'all' : catItem.id)}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-black whitespace-nowrap border transition cursor-pointer ${
                  isSelected
                    ? `${conf.bg} ${conf.text} ${conf.border} ring-2 ring-indigo-500 shadow-sm`
                    : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${conf.dot} ring-2 ring-white/50`} />
                <span>{catItem.label}</span>
                {count > 0 && <span className="opacity-75 text-[10px]">({count})</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* 0. SINGLE DAY / OGGI VIEW */}
      {mode === 'day' && (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-white/90 dark:border-slate-800 shadow-2xl shadow-indigo-950/10 overflow-hidden">
          {/* Header Giornata */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 flex flex-col items-center justify-center shadow-lg shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200">
                  {format(currentDate, 'MMM', { locale: it })}
                </span>
                <span className="text-2xl font-black leading-none">
                  {format(currentDate, 'd')}
                </span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg sm:text-2xl font-black capitalize">
                    {format(currentDate, 'EEEE d MMMM yyyy', { locale: it })}
                  </h2>
                  {isCurrentDateToday && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-xs">
                      Oggi
                    </span>
                  )}
                </div>
                <p className="text-xs text-indigo-100 font-medium mt-0.5">
                  {selectedDayEvents.length}{' '}
                  {selectedDayEvents.length === 1 ? 'evento in programma' : 'eventi in programma'}
                  {selectedDayTasks.length > 0 &&
                    ` • ${selectedDayTasks.length} attività in scadenza`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedDayEvents.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setShareTarget({
                      dayEvents: selectedDayEvents,
                      dayDate: currentDate,
                    })
                  }
                  className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-lg shadow-emerald-900/30 transition cursor-pointer"
                  title="Condividi tutto il programma di questo giorno su WhatsApp o con card logo"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Condividi Giornata</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onOpenEventModal(undefined, format(currentDate, 'yyyy-MM-dd'))}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-white text-indigo-900 hover:bg-indigo-50 text-xs font-black shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Aggiungi Evento</span>
              </button>
            </div>
          </div>

          {/* Lista Eventi e Attività del Giorno */}
          <div className="p-5 sm:p-6 space-y-4">
            {selectedDayEvents.length === 0 && selectedDayTasks.length === 0 ? (
              <div className="text-center py-14 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                <CalendarIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
                <div>
                  <h3 className="text-base font-black text-slate-700 dark:text-slate-300">
                    Nessun impegno per {isCurrentDateToday ? 'oggi' : 'questo giorno'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Clicca su &ldquo;Aggiungi Evento&rdquo; per programmare un appuntamento in questa data.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {selectedDayEvents.map((evt) => {
                  const evtCats = normalizeCategories(evt)
                  const conf = categoryService.getCategoryStyle(evtCats[0])
                  const hasAttachments = Boolean(evt.attachments && evt.attachments.length > 0)

                  return (
                    <div
                      key={evt.id}
                      onClick={() => onOpenEventModal(evt)}
                      className={`p-5 rounded-3xl bg-white dark:bg-slate-800/90 border-2 ${conf.border} hover:border-indigo-500 shadow-md hover:shadow-xl transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                    >
                      <div className="flex items-start space-x-4">
                        {/* Logo & Orario laterale */}
                        <div className="flex flex-col items-center space-y-1.5 shrink-0">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md ring-2 ring-teal-500/30 bg-white p-0.5">
                            <img
                              src={appLogo}
                              alt="Come Tralci"
                              className="w-full h-full object-cover rounded-xl"
                            />
                          </div>
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-black text-[11px]">
                            {evt.allDay ? 'Giornata' : formatTimeSafe(evt.start)}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="flex items-center space-x-1 text-xs font-black text-indigo-600 dark:text-indigo-400">
                              <Clock className="w-3.5 h-3.5" />
                              <span>
                                {evt.allDay
                                  ? 'Tutto il giorno'
                                  : `${formatTimeSafe(evt.start)}${
                                      evt.end ? ` - ${formatTimeSafe(evt.end)}` : ''
                                    }`}
                              </span>
                            </span>

                            {evtCats.map((catId) => {
                              const catConf = categoryService.getCategoryStyle(catId)
                              return (
                                <span
                                  key={catId}
                                  className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${catConf.badge}`}
                                >
                                  {catConf.label}
                                </span>
                              )
                            })}

                            {hasAttachments && (
                              <span className="flex items-center space-x-1 text-[10px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg">
                                <Paperclip className="w-3 h-3" />
                                <span>{evt.attachments!.length} allegati</span>
                              </span>
                            )}
                          </div>

                          <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                            {evt.title}
                          </h4>

                          {evt.description && (
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                              {evt.description}
                            </p>
                          )}

                          {evt.location && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1 pt-0.5 font-semibold">
                              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span>{evt.location}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Azione Condividi su WhatsApp / Card */}
                      <div className="flex items-center justify-end space-x-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShareTarget({ event: evt })
                          }}
                          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-black transition shadow-2xs cursor-pointer"
                          title="Condividi su WhatsApp o con card logo"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Condividi</span>
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Attività (Cose da Fare) in scadenza nel giorno selezionato */}
                {selectedDayTasks.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 px-1">
                      Cose da Fare in scadenza ({selectedDayTasks.length})
                    </h4>
                    {selectedDayTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => onOpenTaskModal(task)}
                        className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between cursor-pointer hover:bg-emerald-100/70 transition"
                      >
                        <div className="flex items-center space-x-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-200">
                            {task.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                          Attività
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 1. MONTH VIEW */}
      {mode === 'month' && (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-white/90 dark:border-slate-800 shadow-2xl shadow-indigo-950/10 overflow-hidden">
          {/* Day of Week Headers with VIBRANT GRADIENT */}
          <div className="grid grid-cols-7 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white text-center py-3.5 shadow-sm">
            {['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'].map(
              (day, idx) => (
                <span
                  key={day}
                  className="text-xs font-black uppercase tracking-wider text-indigo-100"
                >
                  <span className="hidden md:inline">{day}</span>
                  <span className="md:hidden">{['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'][idx]}</span>
                </span>
              )
            )}
          </div>

          {/* Month Day Cells */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
            {monthDays.map((day) => {
              const dayEvents = getEventsOnDay(day)
              const dayTasks = getTasksOnDay(day)
              const isCurrMonth = isSameMonth(day, currentDate)
              const isDayToday = isToday(day)
              const dateStr = format(day, 'yyyy-MM-dd')
              const isWeekend = day.getDay() === 0 || day.getDay() === 6

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => onOpenEventModal(undefined, dateStr)}
                  className={`min-h-[115px] sm:min-h-[140px] p-2 transition group flex flex-col justify-between hover:bg-indigo-50/40 dark:hover:bg-slate-800/60 cursor-pointer ${
                    !isCurrMonth
                      ? 'bg-slate-50/40 dark:bg-slate-950/50 opacity-35'
                      : isWeekend
                      ? 'bg-amber-50/20 dark:bg-slate-900/40'
                      : 'bg-white dark:bg-slate-900'
                  }`}
                >
                  {/* Top cell row */}
                  <div className="flex items-center justify-between mb-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentDate(day)
                        setMode('day')
                      }}
                      title="Apri vista giornaliera per questa data"
                      className={`text-xs font-black w-7 h-7 flex items-center justify-center rounded-xl transition cursor-pointer ${
                        isDayToday
                          ? 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/40 ring-2 ring-purple-300 dark:ring-purple-600'
                          : 'text-slate-800 dark:text-slate-200 hover:bg-indigo-100 dark:hover:bg-slate-700 group-hover:text-indigo-600'
                      }`}
                    >
                      {format(day, 'd')}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenEventModal(undefined, dateStr)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition"
                      title="Aggiungi evento qui"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Badges container */}
                  <div className="flex-1 space-y-1.5 overflow-hidden">
                    {dayEvents.slice(0, 3).map((evt) => {
                      const eventCats = normalizeCategories(evt)
                      const conf = categoryService.getCategoryStyle(eventCats[0])
                      const hasAttachments = Boolean(evt.attachments && evt.attachments.length > 0)

                      return (
                        <div
                          key={evt.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenEventModal(evt)
                          }}
                          className={`flex items-center space-x-1.5 px-2 py-1 rounded-xl text-[10px] font-black border truncate transition hover:scale-[1.03] shadow-xs ${conf.bg} ${conf.text} ${conf.border}`}
                          title={evt.title}
                        >
                          <div className="flex items-center space-x-0.5 shrink-0">
                            {eventCats.map((c) => {
                              const s = categoryService.getCategoryStyle(c)
                              return (
                                <span key={c} className={`w-1.5 h-1.5 rounded-full ${s.dot} ring-1 ring-white/60`} />
                              )
                            })}
                          </div>
                          <span className="truncate flex-1">
                            {!evt.allDay && formatTimeSafe(evt.start)} {evt.title}
                          </span>
                          {hasAttachments && (
                            <Paperclip className="w-3 h-3 shrink-0 opacity-80" />
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
                        className="flex items-center space-x-1.5 px-2 py-1 rounded-xl text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 truncate shadow-2xs"
                        title={`Attività: ${task.title}`}
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate flex-1">{task.title}</span>
                      </div>
                    ))}

                    {dayEvents.length > 3 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setCurrentDate(day)
                          setMode('day')
                        }}
                        className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 pl-1 hover:underline"
                      >
                        +{dayEvents.length - 3} altri
                      </button>
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
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-white/80 dark:border-slate-800 shadow-xl shadow-indigo-950/5 overflow-hidden">
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
                    onClick={() => {
                      setCurrentDate(day)
                      setMode('day')
                    }}
                    className={`p-3 text-center border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-indigo-50/50 transition ${
                      isDayToday
                        ? 'bg-gradient-to-b from-indigo-100 via-purple-50 to-white dark:from-indigo-950/80 dark:to-slate-900'
                        : 'bg-slate-50/70 dark:bg-slate-800/40'
                    }`}
                    title="Clicca per aprire la vista di questo giorno"
                  >
                    <p className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">
                      {format(day, 'EEE', { locale: it })}
                    </p>
                    <span
                      className={`inline-block mt-0.5 text-sm font-black w-8 h-8 leading-8 rounded-xl ${
                        isDayToday
                          ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Events in day column */}
                  <div
                    onClick={() => onOpenEventModal(undefined, dateStr)}
                    className="flex-1 p-2 space-y-2 hover:bg-indigo-50/20 dark:hover:bg-slate-800/20 cursor-pointer"
                  >
                    {dayEvents.map((evt) => {
                      const evtCats = normalizeCategories(evt)
                      const conf = categoryService.getCategoryStyle(evtCats[0])
                      return (
                        <div
                          key={evt.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenEventModal(evt)
                          }}
                          className={`p-2.5 rounded-2xl text-xs font-bold border shadow-xs transition hover:scale-[1.02] ${conf.bg} ${conf.text} ${conf.border}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-black">
                              {evt.allDay ? 'Tutto il giorno' : formatTimeSafe(evt.start)}
                            </span>
                            {evt.attachments && evt.attachments.length > 0 && (
                              <Paperclip className="w-3 h-3 text-slate-500" />
                            )}
                          </div>
                          <p className="font-black line-clamp-2">{evt.title}</p>
                          {evt.location && (
                            <p className="text-[10px] opacity-85 truncate flex items-center space-x-1 mt-1 font-medium">
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
                        className="p-2 rounded-xl text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-2xs"
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

      {/* 3. AGENDA / STREAM VIEW (DA OGGI IN POI) */}
      {mode === 'agenda' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Prossimi eventi in Agenda (da oggi in poi: {upcomingAgendaEvents.length})
            </span>
          </div>

          {upcomingAgendaEvents.length === 0 ? (
            <div className="text-center py-16 bg-white/95 dark:bg-slate-900/95 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8 shadow-sm">
              <CalendarIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                Nessun evento futuro in agenda
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Gli eventi passati sono nascosti automaticamente. Aggiungi un nuovo evento per vederlo qui.
              </p>
            </div>
          ) : (
            upcomingAgendaEvents.map((evt) => {
              const evtCats = normalizeCategories(evt)
              const conf = categoryService.getCategoryStyle(evtCats[0])
              const hasAttachments = Boolean(evt.attachments && evt.attachments.length > 0)

              return (
                <div
                  key={evt.id}
                  onClick={() => onOpenEventModal(evt)}
                  className={`p-5 rounded-3xl bg-white/95 dark:bg-slate-900/95 border ${conf.border} hover:border-indigo-500 shadow-md hover:shadow-2xl transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md ring-2 ring-teal-500/30 bg-white p-0.5 shrink-0">
                      <img
                        src={appLogo}
                        alt="Come Tralci"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {evtCats.map((catId) => {
                          const catConf = categoryService.getCategoryStyle(catId)
                          return (
                            <span
                              key={catId}
                              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${catConf.badge}`}
                            >
                              {catConf.label}
                            </span>
                          )
                        })}
                        {hasAttachments && (
                          <span className="flex items-center space-x-1 text-[10px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg">
                            <Paperclip className="w-3 h-3" />
                            <span>{evt.attachments!.length} allegati</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1.5">
                        {evt.title}
                      </h4>

                      {evt.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 font-medium">
                          {evt.description}
                        </p>
                      )}

                      {evt.location && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1 mt-1 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>{evt.location}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-4 text-xs font-semibold text-slate-600 dark:text-slate-300 sm:text-right shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-slate-900 dark:text-white font-black text-sm sm:text-base capitalize">
                        {formatDateSafe(evt.start, 'EEEE d MMMM yyyy')}
                      </p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-black">
                        {evt.allDay
                          ? 'Tutto il giorno'
                          : `${formatTimeSafe(evt.start)} - ${formatTimeSafe(evt.end)}`}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShareTarget({ event: evt })
                      }}
                      className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-black transition shadow-2xs cursor-pointer"
                      title="Condividi evento su WhatsApp o con card logo"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Condividi</span>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Modale Condivisione Elegante con Logo */}
      {shareTarget && (
        <ShareEventModal
          event={shareTarget.event}
          dayEvents={shareTarget.dayEvents}
          dayDate={shareTarget.dayDate}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  )
}
