import React, { useState } from 'react'
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Paperclip,
  Upload,
  Trash2,
  FileText,
  Image as ImageIcon,
  Check,
  Loader2,
  Mic,
  Music,
} from 'lucide-react'
import type { AppCalendarEvent, EventCategory, EventAttachment } from '../types/event.ts'
import { CATEGORY_COLORS } from '../types/event.ts'
import { api } from '../services/api.ts'
import { formatFileSize, getFileTypeCategory } from '../utils/file.ts'
import { AudioRecorder } from './AudioRecorder.tsx'

interface EventModalProps {
  event?: AppCalendarEvent | null
  initialDate?: string
  onClose: () => void
  onSave: (event: AppCalendarEvent) => void
  onDelete?: (eventId: string) => void
  onPreviewAttachment?: (att: EventAttachment) => void
}

export const EventModal: React.FC<EventModalProps> = ({
  event,
  initialDate,
  onClose,
  onSave,
  onDelete,
  onPreviewAttachment,
}) => {
  const isEditing = Boolean(event?.id)

  const defaultStart = initialDate
    ? `${initialDate}T09:00`
    : new Date().toISOString().slice(0, 16)
  const defaultEnd = initialDate
    ? `${initialDate}T10:00`
    : new Date(Date.now() + 3600000).toISOString().slice(0, 16)

  const [title, setTitle] = useState(event?.title || '')
  const [description, setDescription] = useState(event?.description || '')
  const [location, setLocation] = useState(event?.location || '')
  const [allDay, setAllDay] = useState(event?.allDay ?? false)
  const [start, setStart] = useState(
    event ? (event.allDay ? event.start.slice(0, 10) : event.start.slice(0, 16)) : defaultStart
  )
  const [end, setEnd] = useState(
    event ? (event.allDay ? event.end.slice(0, 10) : event.end.slice(0, 16)) : defaultEnd
  )
  const [category, setCategory] = useState<EventCategory>(event?.category || 'lavoro')
  const [attachments, setAttachments] = useState<EventAttachment[]>(event?.attachments || [])
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)

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

  async function handleSaveVoiceMemo(audioFile: File) {
    setIsUploading(true)
    try {
      const uploaded = await api.uploadFile(audioFile)
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

  function handleRemoveAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setIsSaving(true)
    try {
      const eventData: Omit<AppCalendarEvent, 'id'> = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        start,
        end,
        allDay,
        category,
        attachments,
      }

      let saved: AppCalendarEvent
      if (isEditing && event) {
        const res = await api.updateEvent(event.id, eventData)
        saved = res || { ...eventData, id: event.id }
      } else {
        saved = await api.createEvent(eventData)
      }

      onSave(saved)
      onClose()
    } catch (err) {
      console.error('Errore salvataggio evento:', err)
      alert('Errore durante il salvataggio dell\'evento.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/60 dark:border-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/50 dark:from-slate-800/80 dark:to-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {isEditing ? 'Modifica Evento' : 'Nuovo Evento in Agenda'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Sincronizzato con Google Calendar & Google Drive
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

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Titolo */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Titolo dell'evento *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="es. Riunione bilancio, Visita vigneto, Taglio tralci..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base font-bold transition"
            />
          </div>

          {/* Categorie */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Categoria
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(Object.keys(CATEGORY_COLORS) as EventCategory[]).map((cat) => {
                const conf = CATEGORY_COLORS[cat]
                const isSelected = category === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl text-xs font-bold border transition ${
                      isSelected
                        ? `${conf.bg} ${conf.text} ${conf.border} ring-2 ring-indigo-500 shadow-xs font-black`
                        : 'bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${conf.dot}`} />
                    <span className="truncate">{conf.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tutto il giorno toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2.5">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Tutto il giorno
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => {
                  setAllDay(e.target.checked)
                  if (e.target.checked) {
                    setStart(start.slice(0, 10))
                    setEnd(end.slice(0, 10))
                  } else {
                    setStart(`${start.slice(0, 10)}T09:00`)
                    setEnd(`${end.slice(0, 10)}T10:00`)
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Date & Orari */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Inizio
              </label>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Fine
              </label>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                required
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Luogo */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Luogo / Link Riunione
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="es. Vigneto Nord, Ufficio centrale, Google Meet..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Descrizione / Note */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Note & Dettagli
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Inserisci dettagli, istruzioni o appunti per l'evento..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-medium"
            />
          </div>

          {/* ALLEGATI GOOGLE DRIVE / FILE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                <span>Allegati (Google Drive)</span>
              </label>

              <button
                type="button"
                onClick={() => setShowAudioRecorder((v) => !v)}
                className="flex items-center space-x-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{showAudioRecorder ? 'Chiudi Vocale' : '+ Nota Vocale'}</span>
              </button>
            </div>

            {/* Audio Recorder Component */}
            {showAudioRecorder && (
              <div className="mb-3">
                <AudioRecorder
                  onSaveAudio={handleSaveVoiceMemo}
                  onCancel={() => setShowAudioRecorder(false)}
                />
              </div>
            )}

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragActive(false)
                handleFileUpload(e.dataTransfer.files)
              }}
              className={`relative border-2 border-dashed rounded-2xl p-4 text-center transition cursor-pointer ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-50'
              }`}
            >
              <input
                type="file"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <div className="flex flex-col items-center justify-center space-y-1">
                {isUploading ? (
                  <>
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Caricamento su Google Drive in corso...
                    </p>
                  </>
                ) : (
                  <>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm text-indigo-600">
                      <Upload className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Trascina qui i tuoi allegati o <span className="text-indigo-600 dark:text-indigo-400 underline">sfoglia</span>
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Foto, PDF, ricevute, documenti (fino a 50MB)
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Lista Allegati caricati */}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((att) => {
                  const cat = getFileTypeCategory(att.mimeType, att.name)
                  return (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs group"
                    >
                      <button
                        type="button"
                        onClick={() => onPreviewAttachment && onPreviewAttachment(att)}
                        className="flex items-center space-x-2.5 overflow-hidden text-left flex-1 hover:text-indigo-600 transition"
                      >
                        <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                          {cat === 'image' ? (
                            <ImageIcon className="w-4 h-4" />
                          ) : cat === 'audio' ? (
                            <Music className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600">
                            {att.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {formatFileSize(att.size)}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition ml-2"
                        title="Rimuovi allegato"
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

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60">
          {isEditing && onDelete ? (
            <button
              type="button"
              onClick={() => {
                if (confirm('Sei sicuro di voler eliminare questo evento dal calendario?')) {
                  onDelete(event!.id)
                  onClose()
                }
              }}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Elimina</span>
            </button>
          ) : (
            <div />
          )}

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
              className="flex items-center space-x-2 px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 rounded-xl shadow-md shadow-indigo-500/25 transition cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{isEditing ? 'Salva Modifiche' : 'Crea Evento'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
