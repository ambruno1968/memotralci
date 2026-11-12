import React, { useState, useEffect } from 'react'
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
import { categoryService, type AppCategoryItem, normalizeCategories } from '../services/categoryService.ts'

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
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [quickTitle, setQuickTitle] = useState('')
  const [categories, setCategories] = useState<AppCategoryItem[]>(categoryService.getCategories())

  useEffect(() => {
    return categoryService.subscribe(setCategories)
  }, [])

  function handleCheckTask(task: AppTaskItem, e: React.MouseEvent) {
    e.stopPropagation()
    if (!task.completed) {
      confetti({
        particleCount: 55,
        spread: 65,
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
    if (filterStatus === 'todo' && t.completed) return false
    if (filterStatus === 'completed' && !t.completed) return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (filterCategory !== 'all') {
      const taskCats = normalizeCategories(t)
      if (filterCategory === 'none') {
        if (taskCats.length > 0) return false
      } else {
        if (!taskCats.includes(filterCategory)) return false
      }
    }

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
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto pb-8 sm:pb-12">
      {/* Top Banner & Quick Add */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white shadow-2xl shadow-emerald-950/15 border border-white/20">
        {/* Background decorative pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-3.5 sm:mb-5">
          <div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight flex items-center space-x-2">
              <span>Cose da Fare</span>
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse shrink-0" />
            </h1>
            <p className="text-emerald-100 text-[11px] sm:text-sm mt-1 font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{pendingCount} da completare</span>
              <span>•</span>
              <span>{completedCount} già fatte</span>
              <span>•</span>
              <span className="inline-flex items-center space-x-1 bg-white/20 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-semibold text-white">
                <span>📁</span>
                <span>Archivio: allegati/Archivio_Task</span>
              </span>
            </p>
          </div>

          <button
            onClick={() => onOpenTaskModal()}
            className="flex items-center justify-center space-x-2 px-4 py-2 sm:py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl sm:rounded-2xl font-black text-xs shadow-lg transition shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Nuova Attività</span>
          </button>
        </div>

        {/* Quick Add Bar */}
        <form onSubmit={handleQuickSubmit} className="relative z-10">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Cosa devi fare oggi? Scrivi e premi Invio..."
            className="w-full pl-4 sm:pl-5 pr-24 sm:pr-28 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white placeholder-emerald-100/75 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white focus:bg-white/30 transition shadow-inner"
          />
          <button
            type="submit"
            disabled={!quickTitle.trim()}
            className="absolute right-1.5 sm:right-2 top-1.5 sm:top-2 bottom-1.5 sm:bottom-2 px-3 sm:px-4 bg-white text-emerald-800 disabled:opacity-40 rounded-lg sm:rounded-xl font-bold text-xs transition flex items-center space-x-1 cursor-pointer hover:bg-emerald-50"
          >
            <span>Aggiungi</span>
          </button>
        </form>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl border border-white/80 dark:border-slate-800 shadow-md shadow-indigo-950/5">
        {/* Status Tabs */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800 p-1 rounded-xl sm:rounded-2xl">
          <button
            onClick={() => setFilterStatus('todo')}
            className={`px-2 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition truncate ${
              filterStatus === 'todo'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Da fare ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-2 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition truncate ${
              filterStatus === 'completed'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Completate ({completedCount})
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-2 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition truncate ${
              filterStatus === 'all'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Tutte ({tasks.length})
          </button>
        </div>

        {/* Priority, Category & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="flex-1 sm:flex-none min-w-0 px-2.5 sm:px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="all">Tutte le priorità</option>
            <option value="urgente">🔥 Urgente</option>
            <option value="alta">⚡ Alta</option>
            <option value="media">🔹 Media</option>
            <option value="bassa">▫️ Bassa</option>
          </select>

          {/* Category filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="flex-1 sm:flex-none min-w-0 px-2.5 sm:px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="all">Tutte le categorie</option>
            <option value="none">Senza categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Search box */}
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca task..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Task Cards List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-16 bg-white/90 dark:bg-slate-900/90 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
            Nessuna attività trovata
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {filterStatus === 'todo'
              ? 'Tutto fatto! Non ci sono attività in sospeso.'
              : 'Nessun risultato con i filtri attuali.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
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
                className={`group flex items-center justify-between p-4 sm:p-5 rounded-3xl bg-white/95 dark:bg-slate-900/95 border transition shadow-sm hover:shadow-xl cursor-pointer ${
                  task.completed
                    ? 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 opacity-60'
                    : isExpired
                    ? 'border-rose-300 dark:border-rose-900 hover:border-rose-500 shadow-rose-500/5'
                    : 'border-white/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                }`}
              >
                {/* Left checkmark + text */}
                <div className="flex items-center space-x-3.5 flex-1 min-w-0 pr-3">
                  <button
                    type="button"
                    onClick={(e) => handleCheckTask(task, e)}
                    className="p-1 rounded-xl text-slate-400 hover:text-emerald-600 transition shrink-0"
                  >
                    {task.completed ? (
                      <CheckSquare className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <Square className="w-6 h-6 hover:text-emerald-500" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm sm:text-base font-bold truncate ${
                        task.completed
                          ? 'line-through text-slate-400 dark:text-slate-500 font-normal'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {task.title}
                    </p>

                    {/* Metadata line */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {/* Priority */}
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg border ${pConf.badge} ${pConf.glow}`}
                      >
                        {pConf.label}
                      </span>

                      {/* Category Badges (supporto multi-categoria) */}
                      {normalizeCategories(task).map((catId) => {
                        const catConf = categoryService.getCategoryStyle(catId)
                        return (
                          <span
                            key={catId}
                            className={`flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${catConf.bg} ${catConf.text} ${catConf.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${catConf.dot}`} />
                            <span className="truncate max-w-[120px]">{catConf.label}</span>
                          </span>
                        )
                      })}

                      {/* Due Date */}
                      {task.dueDate && (
                        <span
                          className={`flex items-center space-x-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg ${
                            isExpired
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300'
                              : isToday(new Date(task.dueDate))
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          <span>{formatRelativeDate(task.dueDate)}</span>
                        </span>
                      )}

                      {/* Subtasks pill */}
                      {subtasksCount > 0 && (
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg flex items-center space-x-1">
                          <span>
                            {completedSubtasks}/{subtasksCount} checklist
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
                          className="flex items-center space-x-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 px-2.5 py-0.5 rounded-lg transition"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>{attachmentsCount} allegati</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center space-x-1.5 shrink-0">
                  {task.dueDate && !task.completed && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCreateCalendarEvent(task)
                      }}
                      className="p-2.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl transition shadow-2xs"
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
