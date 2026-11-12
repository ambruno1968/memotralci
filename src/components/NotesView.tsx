import React, { useState, useEffect } from 'react'
import {
  StickyNote,
  Plus,
  Search,
  Pin,
  Trash2,
  Sparkles,
  Share2,
} from 'lucide-react'
import {
  NOTE_COLORS,
  normalizeNoteCategories,
  type AppNoteItem,
  type NoteColor,
} from '../types/note.ts'
import { categoryService, type AppCategoryItem } from '../services/categoryService.ts'
import { formatDateSafe } from '../utils/date.ts'
import { ShareNoteModal } from './ShareNoteModal.tsx'

interface NotesViewProps {
  notes: AppNoteItem[]
  onOpenNoteModal: (note?: AppNoteItem) => void
  onQuickAddNote: (content: string, color: NoteColor, categoryId?: string) => void
  onTogglePinNote: (id: string) => void
  onDeleteNote: (id: string) => void
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  onOpenNoteModal,
  onQuickAddNote,
  onTogglePinNote,
  onDeleteNote,
}) => {
  const [quickText, setQuickText] = useState('')
  const [quickColor, setQuickColor] = useState<NoteColor>('yellow')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<AppCategoryItem[]>(categoryService.getCategories())
  const [shareNote, setShareNote] = useState<AppNoteItem | null>(null)

  useEffect(() => {
    return categoryService.subscribe(setCategories)
  }, [])

  function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!quickText.trim()) return
    const activeCat =
      filterCategory !== 'all' && filterCategory !== 'none' ? filterCategory : undefined
    onQuickAddNote(quickText.trim(), quickColor, activeCat)
    setQuickText('')
  }

  const filteredNotes = notes
    .filter((n) => {
      if (filterCategory !== 'all') {
        const cats = normalizeNoteCategories(n)
        if (filterCategory === 'none') {
          if (cats.length > 0) return false
        } else {
          if (!cats.includes(filterCategory)) return false
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = (n.title || '').toLowerCase().includes(q)
        const matchContent = (n.content || '').toLowerCase().includes(q)
        return matchTitle || matchContent
      }

      return true
    })
    .sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) {
        return a.pinned ? -1 : 1
      }
      return (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)
    })

  const colorList = Object.keys(NOTE_COLORS) as NoteColor[]

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto pb-8 sm:pb-12">
      {/* Top Banner & Quick Post-it Bar */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white shadow-2xl shadow-amber-950/15 border border-white/20">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/15 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-3.5 sm:mb-5">
          <div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight flex items-center space-x-2">
              <span>Note & Post-it</span>
              <Sparkles className="w-5 h-5 text-yellow-200 animate-pulse shrink-0" />
            </h1>
            <p className="text-amber-50 text-[11px] sm:text-sm mt-1 font-medium">
              {notes.length} {notes.length === 1 ? 'post-it salvato' : 'post-it salvati'} • appunti rapidi sincronizzati su Google Drive
            </p>
          </div>

          <button
            onClick={() => onOpenNoteModal()}
            className="flex items-center justify-center space-x-2 px-4 py-2 sm:py-2.5 bg-white text-amber-800 hover:bg-amber-50 rounded-xl sm:rounded-2xl font-black text-xs shadow-lg transition shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-600" />
            <span>Nuovo Post-it</span>
          </button>
        </div>

        {/* Quick Post-it Input */}
        <form onSubmit={handleQuickSubmit} className="relative z-10 space-y-2.5">
          <div className="relative">
            <input
              type="text"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              placeholder="Scrivi un post-it veloce e premi Invio..."
              className="w-full pl-4 sm:pl-5 pr-24 sm:pr-28 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white placeholder-amber-100/80 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white focus:bg-white/30 transition shadow-inner"
            />
            <button
              type="submit"
              disabled={!quickText.trim()}
              className="absolute right-1.5 sm:right-2 top-1.5 sm:top-2 bottom-1.5 sm:bottom-2 px-3 sm:px-4 bg-white text-amber-800 disabled:opacity-40 rounded-lg sm:rounded-xl font-bold text-xs transition flex items-center space-x-1 cursor-pointer hover:bg-amber-50"
            >
              <span>Attacca</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-amber-100">Colore rapido:</span>
            {colorList.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setQuickColor(c)}
                className={`w-5 h-5 rounded-full ${NOTE_COLORS[c].dot} border border-white/80 transition cursor-pointer ${
                  quickColor === c ? 'ring-2 ring-white scale-110' : 'opacity-75 hover:opacity-100'
                }`}
                title={NOTE_COLORS[c].label}
              />
            ))}
          </div>
        </form>
      </div>

      {/* Filter & Search Bar (Uniformata con Task, Agenda e Allegati) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl border border-white/80 dark:border-slate-800 shadow-md shadow-indigo-950/5">
        <div className="flex items-center space-x-2 text-xs font-black text-slate-600 dark:text-slate-300 px-1">
          <StickyNote className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Bacheca Post-it ({filteredNotes.length})</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="flex-1 sm:flex-none min-w-0 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="all">Tutte le categorie</option>
            <option value="none">Senza categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          <div className="relative flex-1 sm:w-52 min-w-[140px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca nelle note..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Post-it Board Grid */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-16 bg-white/90 dark:bg-slate-900/90 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <StickyNote className="w-12 h-12 text-amber-300 dark:text-amber-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
            Nessuna nota Post-it trovata
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Scrivi un appunto veloce nella barra in alto o clicca su "Nuovo Post-it".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredNotes.map((note) => {
            const cConf = NOTE_COLORS[note.color || 'yellow']
            const noteCats = normalizeNoteCategories(note)

            return (
              <div
                key={note.id}
                onClick={() => onOpenNoteModal(note)}
                className={`group relative rounded-2xl rounded-br-none border-2 p-4 sm:p-5 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[170px] ${cConf.card} ${cConf.border}`}
              >
                {/* Top Tape / Pin Bar */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    {note.title && (
                      <h3 className="text-sm font-black tracking-tight leading-snug break-words">
                        {note.title}
                      </h3>
                    )}
                  </div>

                  <div
                    className="flex items-center space-x-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setShareNote(note)}
                      className="p-1.5 rounded-lg opacity-55 hover:opacity-100 hover:text-indigo-600 hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer"
                      title="Condividi nota (WhatsApp / Logo)"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onTogglePinNote(note.id)}
                      className={`p-1.5 rounded-lg transition hover:bg-black/10 dark:hover:bg-white/10 ${
                        note.pinned ? cConf.pin : 'opacity-45 hover:opacity-100'
                      }`}
                      title={note.pinned ? 'Rimuovi fissaggio' : 'Fissa in alto'}
                    >
                      <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Vuoi eliminare questo Post-it?')) {
                          onDeleteNote(note.id)
                        }
                      }}
                      className="p-1.5 rounded-lg opacity-45 hover:opacity-100 hover:text-rose-600 hover:bg-black/10 dark:hover:bg-white/10 transition"
                      title="Elimina nota"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Body text */}
                <p className="text-xs sm:text-[13px] font-medium whitespace-pre-wrap break-words flex-1 leading-relaxed opacity-95">
                  {note.content}
                </p>

                {/* Footer: Categories & Date + Folded Corner */}
                <div className="mt-4 pt-2.5 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex flex-wrap items-center gap-1">
                    {noteCats.map((cId) => {
                      const st = categoryService.getCategoryStyle(cId)
                      return (
                        <span
                          key={cId}
                          className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${st.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          <span>{st.label}</span>
                        </span>
                      )
                    })}
                  </div>
                  <span className="text-[10px] font-bold opacity-65 ml-auto pr-3">
                    {formatDateSafe(note.updatedAt || note.createdAt, 'd MMM')}
                  </span>
                </div>

                {/* Angolo piegato effetto Post-it */}
                <div
                  className={`pointer-events-none absolute bottom-0 right-0 w-0 h-0 border-t-[16px] border-r-[16px] border-r-transparent ${cConf.fold} opacity-80`}
                />
              </div>
            )
          })}
        </div>
      )}

      {shareNote && (
        <ShareNoteModal
          note={shareNote}
          onClose={() => setShareNote(null)}
        />
      )}
    </div>
  )
}

