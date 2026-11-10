import React, { useState, useEffect } from 'react'
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Tag,
  AlertCircle,
} from 'lucide-react'
import {
  categoryService,
  COLOR_PALETTE,
  type AppCategoryItem,
  type CategoryColorName,
} from '../services/categoryService.ts'

interface CategoryManagerModalProps {
  isOpen: boolean
  onClose: () => void
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [categories, setCategories] = useState<AppCategoryItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editColor, setEditColor] = useState<CategoryColorName>('teal')

  const [isCreating, setIsCreating] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState<CategoryColorName>('purple')

  useEffect(() => {
    return categoryService.subscribe((cats) => {
      setCategories(cats)
    })
  }, [])

  if (!isOpen) return null

  const paletteKeys = Object.keys(COLOR_PALETTE) as CategoryColorName[]

  function startEdit(cat: AppCategoryItem) {
    setEditingId(cat.id)
    setEditLabel(cat.label)
    setEditColor(cat.color)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditLabel('')
  }

  function saveEdit() {
    if (!editingId || !editLabel.trim()) return
    categoryService.updateCategory(editingId, editLabel.trim(), editColor)
    setEditingId(null)
    setEditLabel('')
  }

  function handleDelete(cat: AppCategoryItem) {
    const ok = window.confirm(
      `Vuoi davvero eliminare la categoria "${cat.label}"?\n\nI task e gli eventi con questa categoria non verranno eliminati, ma continueranno a mostrare il loro contenuto.`
    )
    if (ok) {
      categoryService.deleteCategory(cat.id)
      if (editingId === cat.id) cancelEdit()
    }
  }

  function handleCreate() {
    if (!newLabel.trim()) return
    categoryService.addCategory(newLabel.trim(), newColor)
    setNewLabel('')
    setIsCreating(false)
  }

  function handleResetDefaults() {
    const ok = window.confirm(
      'Vuoi ripristinare le categorie predefinite (Prog,Vita, Segreteria, Chiesa, Missione, Giovani)?'
    )
    if (ok) {
      categoryService.resetToDefaults()
      cancelEdit()
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-300">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Gestione Categorie
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Modifica nomi, colori o elimina categorie senza perdere i task.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Pulsanti azioni rapide */}
          <div className="flex items-center justify-between gap-2">
            {!isCreating && (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm shadow-teal-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Nuova Categoria</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition flex items-center space-x-1 ml-auto"
              title="Ripristina le 5 categorie default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Predefinite</span>
            </button>
          </div>

          {/* Form Creazione Nuova Categoria */}
          {isCreating && (
            <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-slate-800/90 border border-teal-200 dark:border-teal-800 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-200">
                  Crea Nuova Categoria
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Nome categoria (es. Volontari, Eventi speciali...)"
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                autoFocus
              />

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Scegli Colore:
                </label>
                <div className="flex flex-wrap gap-2">
                  {paletteKeys.map((k) => {
                    const cConf = COLOR_PALETTE[k]
                    const isSelected = newColor === k
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setNewColor(k)}
                        className={`w-6 h-6 rounded-full transition ${cConf.dot} ${
                          isSelected
                            ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        title={cConf.label}
                      />
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!newLabel.trim()}
                  className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs font-bold transition flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Crea</span>
                </button>
              </div>
            </div>
          )}

          {/* Elenco Categorie */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {categories.map((cat) => {
              const style = categoryService.getCategoryStyle(cat.id)
              const isEditing = editingId === cat.id

              if (isEditing) {
                return (
                  <div
                    key={cat.id}
                    className="py-3 space-y-3 bg-slate-50/70 dark:bg-slate-800/60 p-3 rounded-2xl border border-indigo-200 dark:border-indigo-800 my-1"
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        placeholder="Nome categoria"
                        className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={!editLabel.trim()}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center space-x-1 disabled:opacity-40"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Salva</span>
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Colore:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {paletteKeys.map((k) => {
                          const cConf = COLOR_PALETTE[k]
                          const isSelected = editColor === k
                          return (
                            <button
                              key={k}
                              type="button"
                              onClick={() => setEditColor(k)}
                              className={`w-5 h-5 rounded-full transition ${cConf.dot} ${
                                isSelected
                                  ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110'
                                  : 'opacity-70 hover:opacity-100'
                              }`}
                              title={cConf.label}
                            />
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={cat.id}
                  className="py-3 flex items-center justify-between group hover:bg-slate-50/60 dark:hover:bg-slate-800/40 px-2 rounded-xl transition"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span
                      className={`w-3 h-3 rounded-full ${style.dot} shrink-0 ring-2 ring-white/50`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                        {cat.label}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        id: {cat.id}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(cat)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition"
                      title="Modifica nome e colore"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition"
                      title="Elimina categoria (senza toccare i task)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              <strong>Nota sulla sicurezza:</strong> L'eliminazione o la modifica di una categoria non elimina le tue attività o i tuoi eventi. Se modifichi il nome, tutte le attività associate mostreranno istantaneamente la nuova dicitura.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-xs"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
