import React, { useState } from 'react'
import confetti from 'canvas-confetti'
import {
  CheckSquare,
  Square,
  Calendar,
  Paperclip,
  Plus,
  Search,
  CheckCircle2,
  CalendarPlus,
  Sparkles,
} from 'lucide-react'
import type { AppTaskItem } from '../types/task.ts'
import { PRIORITY_CONFIG } from '../types/task.ts'
import type { EventAttachment } from '../types/event.ts'
import { formatRelativeDate, isToday } from '../utils/date.ts'

interface TaskListViewProps {
  tasks: AppTaskItem[]
  onToggleTask: (taskId: string) => void
  onOpenTaskModal: (task?: AppTaskItem) => void
  onDeleteTask: (taskId: string) => void
  onPreviewAttachment: (att: EventAttachment) => void
  onCreateCalendarEvent: (task: AppTaskItem) => void
  onQuickAddTask: (title: string) => void
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  onToggleTask,
  onOpenTaskModal,
  onPreviewAttachment,
  onCreateCalendarEvent,
  onQuickAddTask,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'todo' | 'completed'>('todo')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [quickTitle, setQuickTitle] = useState('')

  function handleCheckTask(task: AppTaskItem, e: React.MouseEvent) {
    e.stopPropagation()
    if (!task.completed) {
      // Fire confetti celebration!
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      })
    }
    onToggleTask(task.id)
  }

  function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!quickTitle.trim()) return
    onQuickAddTask(quickTitle.trim())
    setQuickTitle('')
  }

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    // Status
    if (filterStatus === 'todo' && t.completed) return false
    if (filterStatus === 'completed' && !t.completed) return false

    // Priority
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesTitle = t.title.toLowerCase().includes(q)
      const matchesDesc = (t.description || '').toLowerCase().includes(q)
      return matchesTitle || matchesDesc
    }

    return true
  })

  const completedCount = tasks.filter((t) => t.completed).length
  const pendingCount = tasks.filter((t) => !t.completed).length

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Banner & Quick Add */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-xl shadow-emerald-900/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center space-x-2">
              <span>Cose da Fare</span>
              <Sparkles className="w-5 h-5 text-emerald-200" />
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm mt-0.5">
              {pendingCount} attività in sospeso • {completedCount} completate
            </p>
          </div>

          <button
            onClick={() => onOpenTaskModal()}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-white text-emerald-700 hover:bg-emerald-50 rounded-2xl font-bold text-xs shadow-md transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nuova Attività Dettagliata</span>
          </button>
        </div>

        {/* Quick Add Input Bar */}
        <form onSubmit={handleQuickSubmit} className="relative">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Cosa devi fare oggi? Scrivi e premi Invio..."
            className="w-full pl-4 pr-24 py-3.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white placeholder-emerald-100/70 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white focus:bg-white/25 transition"
          />
          <button
            type="submit"
            disabled={!quickTitle.trim()}
            className="absolute right-2 top-2 bottom-2 px-4 bg-white text-emerald-700 disabled:opacity-40 rounded-xl font-bold text-xs transition flex items-center space-x-1"
          >
            <span>Aggiungi</span>
          </button>
        </form>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Status Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setFilterStatus('todo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterStatus === 'todo'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Da fare ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterStatus === 'completed'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Completate ({completedCount})
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterStatus === 'all'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Tutte ({tasks.length})
          </button>
        </div>

        {/* Priority & Search */}
        <div className="flex items-center space-x-2">
          {/* Priority filter dropdown */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="all">Tutte le priorità</option>
            <option value="urgente">🔥 Urgente</option>
            <option value="alta">⚡ Alta</option>
            <option value="media">🔹 Media</option>
            <option value="bassa">▫️ Bassa</option>
          </select>

          {/* Search box */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca task..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Task Cards List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
          <CheckCircle2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
            Nessuna attività trovata
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {filterStatus === 'todo'
              ? 'Ottimo lavoro! Hai completato tutte le attività in sospeso.'
              : 'Nessun risultato con i filtri attuali.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.map((task) => {
            const pConf = PRIORITY_CONFIG[task.priority]
            const subtasksCount = task.subtasks?.length || 0
            const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0
            const attachmentsCount = task.attachments?.length || 0

            const isExpired =
              task.dueDate &&
              !task.completed &&
              new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0))

            return (
              <div
                key={task.id}
                onClick={() => onOpenTaskModal(task)}
                className={`group flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border transition shadow-xs hover:shadow-md cursor-pointer ${
                  task.completed
                    ? 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 opacity-70'
                    : isExpired
                    ? 'border-rose-300 dark:border-rose-900/50 hover:border-rose-400'
                    : 'border-slate-200/90 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800'
                }`}
              >
                {/* Left checkmark + text */}
                <div className="flex items-center space-x-3.5 flex-1 min-w-0 pr-3">
                  <button
                    type="button"
                    onClick={(e) => handleCheckTask(task, e)}
                    className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 transition shrink-0"
                  >
                    {task.completed ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Square className="w-5 h-5 hover:text-emerald-500" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold truncate ${
                        task.completed
                          ? 'line-through text-slate-400 dark:text-slate-500 font-normal'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {task.title}
                    </p>

                    {/* Metadata line */}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {/* Priority */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${pConf.badge}`}
                      >
                        {pConf.label}
                      </span>

                      {/* Due Date */}
                      {task.dueDate && (
                        <span
                          className={`flex items-center space-x-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                            isExpired
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : isToday(new Date(task.dueDate))
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          <span>{formatRelativeDate(task.dueDate)}</span>
                        </span>
                      )}

                      {/* Subtasks pill */}
                      {subtasksCount > 0 && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md flex items-center space-x-1">
                          <span>
                            {completedSubtasks}/{subtasksCount}
                          </span>
                        </span>
                      )}

                      {/* Attachments pill */}
                      {attachmentsCount > 0 && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            if (task.attachments?.[0]) onPreviewAttachment(task.attachments[0])
                          }}
                          className="flex items-center space-x-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>{attachmentsCount} allegati</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center space-x-1 shrink-0">
                  {task.dueDate && !task.completed && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCreateCalendarEvent(task)
                      }}
                      className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition"
                      title="Sincronizza come evento nel Calendario Google"
                    >
                      <CalendarPlus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
