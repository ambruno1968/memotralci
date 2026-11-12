import React, { useState } from 'react'
import { X, StickyNote, Pin, Trash2, Check, Share2 } from 'lucide-react'
import {
  NOTE_COLORS,
  normalizeNoteCategories,
  type AppNoteItem,
  type NoteColor,
} from '../types/note.ts'
import { CategoryPicker } from './CategoryPicker.tsx'
import { ShareNoteModal } from './ShareNoteModal.tsx'

interface NoteModalProps {
  note?: AppNoteItem | null
  onClose: () => void
  onSave: (note: AppNoteItem) => void
  onDelete?: (id: string) => void
}

export const NoteModal: React.FC<NoteModalProps> = ({
  note,
  onClose,
  onSave,
  onDelete,
}) => {
  const isEditing = Boolean(note)

  const [title, setTitle] = useState(note?.title || '')
  const [content, setContent] = useState(note?.content || '')
  const [color, setColor] = useState<NoteColor>(note?.color || 'yellow')
  const [pinned, setPinned] = useState<boolean>(Boolean(note?.pinned))
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [categories, setCategories] = useState<string[]>(() => normalizeNoteCategories(note))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() && !title.trim()) return

    const now = new Date().toISOString()
    const item: AppNoteItem = {
      id: note?.id || `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim() || undefined,
      content: content.trim(),
      color,
      pinned,
      categories,
      category: categories.length > 0 ? categories.join(',') : undefined,
      createdAt: note?.createdAt || now,
      updatedAt: now,
    }
    onSave(item)
    onClose()
  }

  const colorList = Object.keys(NOTE_COLORS) as NoteColor[]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-150 safe-top safe-bottom"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[88dvh] sm:max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/60 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-50/70 via-white to-orange-50/50 dark:from-slate-800/90 dark:via-slate-900 dark:to-slate-800/70 shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 shrink-0">
              <StickyNote className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {isEditing ? 'Modifica Nota Post-it' : 'Nuova Nota Post-it'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                Appunti rapidi sincronizzati e categorizzati
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            {(content.trim() || title.trim()) && (
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="p-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition cursor-pointer"
                title="Condividi nota (WhatsApp / Logo)"
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Colore Post-it & Pin */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1">
                Colore:
              </span>
              {colorList.map((c) => {
                const conf = NOTE_COLORS[c]
                const isSelected = color === c
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full ${conf.dot} transition cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-slate-700 dark:ring-white scale-110'
                        : 'opacity-75 hover:opacity-100'
                    }`}
                    title={conf.label}
                  />
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => setPinned((p) => !p)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                pinned
                  ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Pin className={`w-3.5 h-3.5 ${pinned ? 'fill-current' : ''}`} />
              <span>{pinned ? 'Fissata' : 'Fissa'}</span>
            </button>
          </div>

          {/* Titolo */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Titolo (facoltativo)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="es. Promemoria veloce, Idee, Spesa..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-bold"
            />
          </div>

          {/* Contenuto Post-it */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Testo della nota *
            </label>
            <textarea
              rows={5}
              required
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Scrivi qui il tuo post-it..."
              className={`w-full p-4 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none shadow-inner ${NOTE_COLORS[color].card} ${NOTE_COLORS[color].border}`}
            />
          </div>

          {/* Categorie Uniformate */}
          <CategoryPicker values={categories} onChange={setCategories} />
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
          {isEditing && onDelete ? (
            <button
              type="button"
              onClick={() => {
                if (confirm('Vuoi eliminare questa nota Post-it?')) {
                  onDelete(note!.id)
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
            {(content.trim() || title.trim()) && (
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 sm:px-3.5 py-2 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 rounded-xl transition cursor-pointer"
                title="Condividi nota con logo e locandina"
              >
                <Share2 className="w-4 h-4" />
                <span>Condividi</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!content.trim() && !title.trim()}
              className="flex items-center space-x-1.5 px-5 py-2 text-xs font-black text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 rounded-xl shadow-md shadow-amber-500/25 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Salva Nota' : 'Crea Post-it'}</span>
            </button>
          </div>
        </div>
      </div>

      {isShareModalOpen && (
        <ShareNoteModal
          note={{
            id: note?.id || 'preview',
            title: title.trim() || undefined,
            content: content.trim(),
            color,
            pinned,
            categories,
            category: categories.length > 0 ? categories.join(',') : undefined,
            createdAt: note?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  )
}

