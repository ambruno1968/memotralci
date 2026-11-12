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
  Mic,
  Music,
} from 'lucide-react'
import type { AppTaskItem, TaskPriority } from '../types/task.ts'
import { PRIORITY_CONFIG } from '../types/task.ts'
import type { EventAttachment } from '../types/event.ts'
import { api } from '../services/api.ts'
import { getFileTypeCategory } from '../utils/file.ts'
import { AudioRecorder } from './AudioRecorder.tsx'
import { CategoryPicker } from './CategoryPicker.tsx'
import { normalizeCategories } from '../services/categoryService.ts'

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
  const [categories, setCategories] = useState<string[]>(() => normalizeCategories(task))
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>(
    task?.subtasks || []
  )
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [attachments, setAttachments] = useState<EventAttachment[]>(task?.attachments || [])
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)

  async function handleDeleteAttachment(att: EventAttachment) {
    const ok = window.confirm(
      `Vuoi eliminare definitivamente l'allegato "${att.name}" anche da Google Drive / archivio?`
    )
    if (!ok) return
    setAttachments((prev) => prev.filter((a) => a.id !== att.id))
    try {
      await api.deleteAttachment(att.id)
    } catch (err) {
      console.warn('Errore eliminazione fisica allegato:', err)
    }
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setIsUploading(true)

    try {
      const uploadPromises = Array.from(files).map((f) => api.uploadFile(f, categories))
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

  async function handleSaveVoiceMemo(audioFile: File) {
    setIsUploading(true)
    try {
      const uploaded = await api.uploadFile(audioFile, categories)
      setAttachments((prev) => [
        ...prev,
        {
          id: uploaded.id,
          name: uploaded.name,
          mimeType: uploaded.mimeType,
          size: uploaded.size,
          webViewLink: uploaded.webViewLink,
          webContentLink: uploaded.webContentLink,
          isLocal: uploaded.isLocal,
        },
      ])
      setShowAudioRecorder(false)
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
        categories,
        category: categories.length > 0 ? categories.join(',') : undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-150 safe-top safe-bottom">
      <div className="relative w-full max-w-xl max-h-[88dvh] sm:max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/60 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-50/50 via-white to-teal-50/50 dark:from-slate-800/80 dark:to-slate-800/50 shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 shrink-0">
              <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {isEditing ? 'Modifica Attività' : 'Nuova Cosa da Fare'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                Organizza task, checklist e documenti correlati
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Titolo */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Attività *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="es. Ordinare nuovi tralci per vigneto, Inviare fattura, Preparare report..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base font-bold transition"
            />
          </div>

          {/* Priorità e Scadenza */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Priorità
              </label>
              <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                {(['bassa', 'media', 'alta', 'urgente'] as TaskPriority[]).map((p) => {
                  const conf = PRIORITY_CONFIG[p]
                  const isSelected = priority === p
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 px-0.5 sm:px-1 text-center rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-tight sm:tracking-normal border transition flex items-center justify-center whitespace-nowrap overflow-hidden ${
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Data di scadenza
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Categorie Gestibili (Multi-selezione) */}
          <CategoryPicker values={categories} onChange={setCategories} />

          {/* Descrizione / Note */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Dettagli & Note
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Aggiungi istruzioni, contatti o note utili..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-medium"
            />
          </div>

          {/* SOTTO-ATTIVITÀ (Checklist) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Checklist / Sotto-Attività
              </label>
              {subtasks.length > 0 && (
                <span className="text-xs text-slate-400 font-bold">
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
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-bold transition flex items-center space-x-1 border border-emerald-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Aggiungi</span>
              </button>
            </div>

            {subtasks.length > 0 && (
              <div className="space-y-1.5 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    <label className="flex items-center space-x-2.5 cursor-pointer flex-1 overflow-hidden">
                      <input
                        type="checkbox"
                        checked={st.completed}
                        onChange={() => handleToggleSubtask(st.id)}
                        className="rounded-lg text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span
                        className={`text-xs font-semibold truncate ${
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
              <label className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <Paperclip className="w-3.5 h-3.5 text-emerald-500" />
                <span>Documenti & Allegati</span>
              </label>

              <button
                type="button"
                onClick={() => setShowAudioRecorder((v) => !v)}
                className="flex items-center space-x-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{showAudioRecorder ? 'Chiudi Vocale' : '+ Nota Vocale'}</span>
              </button>
            </div>

            {/* Audio Recorder */}
            {showAudioRecorder && (
              <div className="mb-3">
                <AudioRecorder
                  onSaveAudio={handleSaveVoiceMemo}
                  onCancel={() => setShowAudioRecorder(false)}
                />
              </div>
            )}

            <div
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDragActive(true)
              }}
              onDragEnter={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDragActive(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDragActive(false)
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDragActive(false)
                if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                  handleFileUpload(e.dataTransfer.files)
                }
              }}
              className={`relative border-2 border-dashed rounded-2xl p-4 text-center transition cursor-pointer flex flex-col items-center justify-center ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-500/15 dark:bg-emerald-500/20 ring-2 ring-emerald-400/50'
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50/60 dark:bg-slate-800/40'
              }`}
            >
              <input
                type="file"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              {isUploading ? (
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                  <span>Caricamento allegati in corso...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-1">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                    <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Trascina qui i file o clicca per caricare</span>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                    Supporta ricevute, foto, PDF e documenti (Google Drive)
                  </span>
                </div>
              )}
            </div>

            {attachments.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                {attachments.map((att) => {
                  const cat = getFileTypeCategory(att.mimeType, att.name)
                  return (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs"
                    >
                      <button
                        type="button"
                        onClick={() => onPreviewAttachment && onPreviewAttachment(att)}
                        className="flex items-center space-x-2 overflow-hidden text-left flex-1 hover:text-emerald-600"
                      >
                        <div className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                          {cat === 'image' ? (
                            <ImageIcon className="w-3.5 h-3.5" />
                          ) : cat === 'audio' ? (
                            <Music className="w-3.5 h-3.5" />
                          ) : (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {att.name}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded ml-2"
                        title="Elimina definitivamente l'allegato anche da Google Drive"
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
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center space-x-2">
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={() => {
                  const msg =
                    attachments.length > 0
                      ? 'Vuoi eliminare questa attività? Verranno eliminati fisicamente anche gli allegati collegati da Google Drive.'
                      : 'Vuoi eliminare questa attività?'
                  if (confirm(msg)) {
                    onDelete(task!.id)
                    onClose()
                  }
                }}
                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition cursor-pointer"
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
                className="flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-xl transition border border-indigo-200"
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
              className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Annulla
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving || !title.trim()}
              className="flex items-center space-x-2 px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 rounded-xl shadow-md shadow-emerald-500/25 transition cursor-pointer"
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
