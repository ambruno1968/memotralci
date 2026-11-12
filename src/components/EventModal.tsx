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
  Share2,
} from 'lucide-react'
import type { AppCalendarEvent, EventAttachment } from '../types/event.ts'
import { api } from '../services/api.ts'
import { formatFileSize, getFileTypeCategory } from '../utils/file.ts'
import { AudioRecorder } from './AudioRecorder.tsx'
import { CategoryPicker } from './CategoryPicker.tsx'
import { ShareEventModal } from './ShareEventModal.tsx'
import { normalizeCategories } from '../services/categoryService.ts'

interface EventModalProps {
  event?: AppCalendarEvent | null
  initialDate?: string
  onClose: () => void
  onSave: (event: AppCalendarEvent) => void
  onDelete?: (eventId: string) => void
  onPreviewAttachment?: (att: EventAttachment) => void
}

// Helper per calcolare data e orario locale con minuti arrotondati a multipli di 5
function getRoundedLocalDatetime(offsetMs = 0): string {
  const d = new Date(Date.now() + offsetMs)
  const rawMinutes = d.getMinutes()
  const roundedMinutes = Math.round(rawMinutes / 5) * 5
  if (roundedMinutes >= 60) {
    d.setHours(d.getHours() + 1)
    d.setMinutes(0)
  } else {
    d.setMinutes(roundedMinutes)
  }
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Helper per convertire una stringa ISO (anche con offset o Z) in formato input locale YYYY-MM-DD o YYYY-MM-DDTHH:mm
function toLocalInputValue(isoOrDate: string, isAllDay: boolean): string {
  if (!isoOrDate) return ''
  if (isAllDay || isoOrDate.length <= 10) {
    return isoOrDate.slice(0, 10)
  }
  const d = new Date(isoOrDate)
  if (isNaN(d.getTime())) {
    return isoOrDate.slice(0, 16)
  }
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
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
    : getRoundedLocalDatetime(0)
  const defaultEnd = initialDate
    ? `${initialDate}T10:00`
    : getRoundedLocalDatetime(3600000)

  const [title, setTitle] = useState(event?.title || '')
  const [description, setDescription] = useState(event?.description || '')
  const [location, setLocation] = useState(event?.location || '')
  const [allDay, setAllDay] = useState(event?.allDay ?? false)
  const [start, setStart] = useState(
    event ? toLocalInputValue(event.start, Boolean(event.allDay)) : defaultStart
  )
  const [end, setEnd] = useState(
    event ? toLocalInputValue(event.end || event.start, Boolean(event.allDay)) : defaultEnd
  )
  const [categories, setCategories] = useState<string[]>(() => normalizeCategories(event))
  const [attachments, setAttachments] = useState<EventAttachment[]>(event?.attachments || [])
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  // Gestione cambio orario di inizio con aggiornamento automatico orario di fine (uguale o superiore)
  function handleStartChange(newStart: string) {
    setStart(newStart)
    if (!newStart) return

    // Se l'orario di fine è inferiore al nuovo inizio, aggiornalo per essere uguale o superiore
    if (!end || end < newStart) {
      if (allDay) {
        setEnd(newStart)
      } else {
        try {
          const s = new Date(newStart)
          const e = new Date(s.getTime() + 3600000)
          const year = e.getFullYear()
          const month = String(e.getMonth() + 1).padStart(2, '0')
          const day = String(e.getDate()).padStart(2, '0')
          const hours = String(e.getHours()).padStart(2, '0')
          const rawM = e.getMinutes()
          const minutes = String(Math.round(rawM / 5) * 5 % 60).padStart(2, '0')
          setEnd(`${year}-${month}-${day}T${hours}:${minutes}`)
        } catch {
          setEnd(newStart)
        }
      }
    }
  }

  // Gestione cambio orario di fine (garantisce sempre uguale o superiore a inizio)
  function handleEndChange(newEnd: string) {
    if (start && newEnd < start) {
      setEnd(start)
    } else {
      setEnd(newEnd)
    }
  }

  async function handleRemoveAttachment(att: EventAttachment) {
    const ok = window.confirm(
      `Vuoi eliminare definitivamente l'allegato "${att.name}" anche da Google Drive / archivio?`
    )
    if (!ok) return
    setAttachments((prev) => prev.filter((a) => a.id !== att.id))
    try {
      await api.deleteAttachment(att.id)
    } catch (e) {
      console.warn('Errore cancellazione fisica allegato:', e)
    }
  }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setIsSaving(true)
    try {
      const finalEnd = !end || end < start ? start : end
      const eventData: Omit<AppCalendarEvent, 'id'> = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        start,
        end: finalEnd,
        allDay,
        categories,
        category: categories.length > 0 ? categories.join(',') : undefined,
        attachments,
      }

      let saved: AppCalendarEvent
      if (isEditing && event) {
        const res = await api.updateEvent(event.id, { ...eventData, calendarId: event.calendarId })
        saved = res || { ...eventData, id: event.id, calendarId: event.calendarId }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-150 safe-top safe-bottom">
      <div className="relative w-full max-w-xl max-h-[88dvh] sm:max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/60 dark:border-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/50 dark:from-slate-800/90 dark:via-slate-900 dark:to-slate-800/70 shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {isEditing ? 'Modifica Evento' : 'Nuovo Evento in Agenda'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                Sincronizzato con Google Calendar & Google Drive
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            {title.trim() && (
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="p-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition cursor-pointer"
                title="Condividi evento (WhatsApp / Logo)"
              >
                <Share2 className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
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

          {/* Categorie (Multi-selezione) */}
          <CategoryPicker values={categories} onChange={setCategories} />

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
                    const dStart = start.slice(0, 10)
                    const dEnd = end.slice(0, 10) >= dStart ? end.slice(0, 10) : dStart
                    setStart(dStart)
                    setEnd(dEnd)
                  } else {
                    const dStart = start.slice(0, 10)
                    const dEnd = end.slice(0, 10) >= dStart ? end.slice(0, 10) : dStart
                    setStart(`${dStart}T09:00`)
                    setEnd(`${dEnd}T10:00`)
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Date & Orari (passo minuti a 5 min, fine >= inizio) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Inizio
              </label>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                step={allDay ? undefined : 300}
                required
                value={start}
                onChange={(e) => handleStartChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Fine
              </label>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                step={allDay ? undefined : 300}
                min={start}
                required
                value={end}
                onChange={(e) => handleEndChange(e.target.value)}
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
                        onClick={() => handleRemoveAttachment(att)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition ml-2"
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

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
          {isEditing && onDelete ? (
            confirmDelete ? (
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onDelete(event!.id)
                    onClose()
                  }}
                  className="flex items-center space-x-1 px-3 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Conferma Elimina</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Elimina</span>
              </button>
            )
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-2">
            {title.trim() && (
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 sm:px-3.5 py-2.5 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 rounded-xl transition cursor-pointer"
                title="Condividi evento con logo e locandina"
              >
                <Share2 className="w-4 h-4" />
                <span>Condividi</span>
              </button>
            )}
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

      {isShareModalOpen && (
        <ShareEventModal
          event={{
            id: event?.id || 'preview',
            calendarId: event?.calendarId,
            title: title.trim() || 'Evento',
            description: description.trim(),
            location: location.trim(),
            start,
            end: !end || end < start ? start : end,
            allDay,
            categories,
            category: categories.length > 0 ? categories.join(',') : undefined,
            attachments,
          }}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  )
}
