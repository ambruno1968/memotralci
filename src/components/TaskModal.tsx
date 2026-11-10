import React, { useState } from 'react'
import {
  X,
  CheckSquare,
  Calendar,
  Plus,
  Trash2,
  Paperclip,
  Upload,
  FileText,
  Image as ImageIcon,
  Check,
  Loader2,
  CalendarPlus,
} from 'lucide-react'
import type { AppTaskItem, TaskPriority, TaskCategory } from '../types/task.ts'
import { PRIORITY_CONFIG } from '../types/task.ts'
import type { EventAttachment } from '../types/event.ts'
import { api } from '../services/api.ts'
import { getFileTypeCategory } from '../utils/file.ts'

interface TaskModalProps {
  task?: AppTaskItem | null
  onClose: () => void
  onSave: (task: AppTaskItem) => void
  onDelete?: (taskId: string) => void
  onPreviewAttachment?: (att: EventAttachment) => void
  onCreateCalendarEventFromTask?: (task: AppTaskItem) => void
}

export const TaskModal: React.FC<TaskModalProps> = ({
  task,
  onClose,
  onSave,
  onDelete,
  onPreviewAttachment,
  onCreateCalendarEventFromTask,
}) => {
  const isEditing = Boolean(task?.id)

  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [dueDate, setDueDate] = useState(task?.dueDate || '')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'media')
  const [category] = useState<TaskCategory>(task?.category || 'lavoro')
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>(
    task?.subtasks || []
  )
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [attachments, setAttachments] = useState<EventAttachment[]>(task?.attachments || [])
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setIsUploading(true)

    try {
      const uploadPromises = Array.from(files).map((f) => api.uploadFile(f))
      const uploadedResults = await Promise.all(uploadPromises)

      const newAtts: EventAttachment[] = uploadedResults.map((u) => ({
        id: u.id,
        name: u.name,
        mimeType: u.mimeType,
        size: u.size,
        webViewLink: u.webViewLink,
        webContentLink: u.webContentLink,
        isLocal: u.isLocal,
      }))

      setAttachments((prev) => [...prev, ...newAtts])
    } catch (err) {
      console.error('Errore upload:', err)
      alert('Si è verificato un errore durante il caricamento del file.')
    } finally {
      setIsUploading(false)
    }
  }

  function handleAddSubtask() {
    if (!newSubtaskTitle.trim()) return
    setSubtasks((prev) => [
      ...prev,
      {
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        title: newSubtaskTitle.trim(),
        completed: false,
      },
    ])
    setNewSubtaskTitle('')
  }

  function handleToggleSubtask(id: string) {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    )
  }

  function handleRemoveSubtask(id: string) {
    setSubtasks((prev) => prev.filter((s) => s.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setIsSaving(true)
    try {
      const taskItem: AppTaskItem = {
        id: task?.id || `task_${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        completed: task?.completed ?? false,
        dueDate: dueDate || undefined,
        priority,
        category,
        subtasks,
        attachments,
        calendarEventId: task?.calendarEventId,
        createdAt: task?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      onSave(taskItem)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Modifica Attività' : 'Nuova Cosa da Fare'}
              </h2>
              <p className="text-xs text-slate-500">
                Organizza task, checklist e documenti correlati
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Titolo */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Attività *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="es. Ordinare nuovi tralci per vigneto, Inviare fattura, Preparare report..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base font-medium transition"
            />
          </div>

          {/* Priorità e Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Priorità
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['bassa', 'media', 'alta', 'urgente'] as TaskPriority[]).map((p) => {
                  const conf = PRIORITY_CONFIG[p]
                  const isSelected = priority === p
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition ${
                        isSelected
                          ? `${conf.badge} ring-2 ring-emerald-500 shadow-xs border-transparent`
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {conf.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Data di scadenza
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Descrizione / Note */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Dettagli & Note
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Aggiungi istruzioni, contatti o note utili..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            />
          </div>

          {/* SOTTO-ATTIVITÀ (Checklist) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Checklist / Sotto-Attività
              </label>
              {subtasks.length > 0 && (
                <span className="text-xs text-slate-400">
                  {subtasks.filter((s) => s.completed).length} di {subtasks.length} completate
                </span>
              )}
            </div>

            <div className="flex space-x-2 mb-2.5">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddSubtask()
                  }
                }}
                placeholder="Aggiungi punto di controllo..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-xl text-xs font-semibold transition flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Aggiungi</span>
              </button>
            </div>

            {subtasks.length > 0 && (
              <div className="space-y-1.5 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    <label className="flex items-center space-x-2.5 cursor-pointer flex-1 overflow-hidden">
                      <input
                        type="checkbox"
                        checked={st.completed}
                        onChange={() => handleToggleSubtask(st.id)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span
                        className={`text-xs truncate ${
                          st.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {st.title}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(st.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ALLEGATI GOOGLE DRIVE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Paperclip className="w-3.5 h-3.5 text-emerald-500" />
                <span>Documenti & Allegati</span>
              </label>
              <span className="text-xs text-slate-400">
                {attachments.length} {attachments.length === 1 ? 'file' : 'file'}
              </span>
            </div>

            <label className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded-2xl p-4 text-center transition cursor-pointer flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-800/30">
              <input
                type="file"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
                className="sr-only"
                disabled={isUploading}
              />
              {isUploading ? (
                <div className="flex items-center space-x-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                  <span>Caricamento allegati in corso...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300">
                  <Upload className="w-4 h-4 text-emerald-500" />
                  <span>Carica ricevute, preventivi, foto o PDF su Google Drive</span>
                </div>
              )}
            </label>

            {attachments.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                {attachments.map((att) => {
                  const cat = getFileTypeCategory(att.mimeType, att.name)
                  return (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs"
                    >
                      <button
                        type="button"
                        onClick={() => onPreviewAttachment && onPreviewAttachment(att)}
                        className="flex items-center space-x-2 overflow-hidden text-left flex-1 hover:text-emerald-600"
                      >
                        <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                          {cat === 'image' ? (
                            <ImageIcon className="w-3.5 h-3.5" />
                          ) : (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                          {att.name}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAttachments((prev) => prev.filter((a) => a.id !== att.id))
                        }
                        className="p-1 text-slate-400 hover:text-rose-500 rounded ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-2">
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Vuoi eliminare questa attività?')) {
                    onDelete(task!.id)
                    onClose()
                  }
                }}
                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition"
                title="Elimina attività"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {dueDate && onCreateCalendarEventFromTask && (
              <button
                type="button"
                onClick={() => {
                  if (task) {
                    onCreateCalendarEventFromTask(task)
                    onClose()
                  }
                }}
                className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-xl transition"
                title="Crea evento corrispondente nel Calendario Google"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Aggiungi a Calendario</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Annulla
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving || !title.trim()}
              className="flex items-center space-x-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-md shadow-emerald-500/20 transition cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{isEditing ? 'Salva Modifiche' : 'Crea Attività'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
