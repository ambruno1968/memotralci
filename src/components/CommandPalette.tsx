import React, { useState, useEffect, useRef } from 'react'
import {
  Search,
  Calendar,
  CheckSquare,
  Paperclip,
  X,
  Plus,
  Sun,
  Download,
  ArrowRight,
} from 'lucide-react'
import type { AppCalendarEvent } from '../types/event.ts'
import type { AppTaskItem } from '../types/task.ts'
import type { UploadedAttachment } from '../types/attachment.ts'
import { formatDateSafe } from '../utils/date.ts'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  events: AppCalendarEvent[]
  tasks: AppTaskItem[]
  attachments: UploadedAttachment[]
  onSelectEvent: (event: AppCalendarEvent) => void
  onSelectTask: (task: AppTaskItem) => void
  onSelectAttachment: (att: UploadedAttachment) => void
  onNewEvent: () => void
  onNewTask: () => void
  onToggleTheme: () => void
  onExportIcs: () => void
  onNavigateView: (view: 'calendar' | 'tasks' | 'attachments') => void
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  events,
  tasks,
  attachments,
  onSelectEvent,
  onSelectTask,
  onSelectAttachment,
  onNewEvent,
  onNewTask,
  onToggleTheme,
  onExportIcs,
  onNavigateView,
}) => {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
    }
  }, [isOpen])

  // Keyboard shortcut Ctrl+K / Cmd+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
        else {
          // Open
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const q = query.toLowerCase().trim()

  const matchingEvents = q
    ? events.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.location && e.location.toLowerCase().includes(q))
      )
    : events.slice(0, 3)

  const matchingTasks = q
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      )
    : tasks.filter((t) => !t.completed).slice(0, 3)

  const matchingAttachments = q
    ? attachments.filter((a) => a.name.toLowerCase().includes(q))
    : attachments.slice(0, 3)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-20 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-white/80 dark:border-slate-800 flex flex-col max-h-[85vh]">
        {/* Search Input Bar */}
        <div className="relative flex items-center px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <Search className="w-5 h-5 text-indigo-500 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca eventi, task, file, o digita un comando..."
            className="w-full bg-transparent text-sm sm:text-base font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-[10px] font-black uppercase text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
              ESC
            </span>
          )}
        </div>

        {/* Search Results list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick Actions (when no search query or matching) */}
          {!q && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 px-2">
                Azioni Rapide
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    onClose()
                    onNewEvent()
                  }}
                  className="flex items-center space-x-2.5 p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition text-left cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>Nuovo Evento Calendario</span>
                </button>

                <button
                  onClick={() => {
                    onClose()
                    onNewTask()
                  }}
                  className="flex items-center space-x-2.5 p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition text-left cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>Nuova Cosa da Fare</span>
                </button>

                <button
                  onClick={() => {
                    onClose()
                    onToggleTheme()
                  }}
                  className="flex items-center space-x-2.5 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition text-left cursor-pointer"
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Cambia Tema Scuro/Chiaro</span>
                </button>

                <button
                  onClick={() => {
                    onClose()
                    onExportIcs()
                  }}
                  className="flex items-center space-x-2.5 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition text-left cursor-pointer"
                >
                  <Download className="w-4 h-4 text-purple-500" />
                  <span>Esporta Calendario (.ics)</span>
                </button>
              </div>
            </div>
          )}

          {/* Events Results */}
          {matchingEvents.length > 0 && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 px-2 flex items-center justify-between">
                <span>Eventi in Agenda ({matchingEvents.length})</span>
                <span
                  onClick={() => {
                    onClose()
                    onNavigateView('calendar')
                  }}
                  className="text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline normal-case"
                >
                  Vedi tutti
                </span>
              </p>
              <div className="space-y-1.5">
                {matchingEvents.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => {
                      onClose()
                      onSelectEvent(evt)
                    }}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {evt.title}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {formatDateSafe(evt.start)} {evt.location ? `• ${evt.location}` : ''}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks Results */}
          {matchingTasks.length > 0 && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 px-2 flex items-center justify-between">
                <span>Cose da Fare ({matchingTasks.length})</span>
                <span
                  onClick={() => {
                    onClose()
                    onNavigateView('tasks')
                  }}
                  className="text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline normal-case"
                >
                  Vedi tutte
                </span>
              </p>
              <div className="space-y-1.5">
                {matchingTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      onClose()
                      onSelectTask(t)
                    }}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-slate-800 transition cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p
                          className={`text-xs font-bold truncate ${
                            t.completed
                              ? 'line-through text-slate-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {t.title}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium">
                          Priorità {t.priority} {t.dueDate ? `• Scadenza: ${formatDateSafe(t.dueDate)}` : ''}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments Results */}
          {matchingAttachments.length > 0 && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 px-2 flex items-center justify-between">
                <span>Allegati & File ({matchingAttachments.length})</span>
                <span
                  onClick={() => {
                    onClose()
                    onNavigateView('attachments')
                  }}
                  className="text-purple-600 dark:text-purple-400 cursor-pointer hover:underline normal-case"
                >
                  Vedi tutti
                </span>
              </p>
              <div className="space-y-1.5">
                {matchingAttachments.map((att) => (
                  <div
                    key={att.id}
                    onClick={() => {
                      onClose()
                      onSelectAttachment(att)
                    }}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-purple-50 dark:hover:bg-slate-800 transition cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0">
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {att.name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {formatDateSafe(att.createdTime)}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {q &&
            matchingEvents.length === 0 &&
            matchingTasks.length === 0 &&
            matchingAttachments.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Nessun elemento corrispondente a "{query}"
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

