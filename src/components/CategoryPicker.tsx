import React, { useState, useEffect } from 'react'
import { Plus, X, Tag, Check, Settings2 } from 'lucide-react'
import {
  categoryService,
  COLOR_PALETTE,
  MAX_CATEGORIES,
  type AppCategoryItem,
  type CategoryColorName,
} from '../services/categoryService.ts'
import { CategoryManagerModal } from './CategoryManagerModal.tsx'

interface CategoryPickerProps {
  value?: string | string[]
  values?: string[]
  onChange?: (categories: string[]) => void
  onChangeSingle?: (category: string) => void
  label?: string
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  value,
  values,
  onChange,
  onChangeSingle,
  label = 'Categorie',
}) => {
  const [categories, setCategories] = useState<AppCategoryItem[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [selectedColor, setSelectedColor] = useState<CategoryColorName>('purple')
  const [isManagerOpen, setIsManagerOpen] = useState(false)
  const [limitError, setLimitError] = useState<string | null>(null)

  // Calcola l'array normalizzato delle categorie correntemente selezionate
  const currentSelected: string[] = React.useMemo(() => {
    const list: string[] = []
    if (Array.isArray(values)) {
      list.push(...values)
    } else if (Array.isArray(value)) {
      list.push(...value)
    } else if (typeof value === 'string' && value.trim()) {
      list.push(...value.split(',').map((s) => s.trim()).filter(Boolean))
    }
    return list
  }, [value, values])

  useEffect(() => {
    return categoryService.subscribe((cats) => {
      setCategories(cats)
    })
  }, [])

  function toggleCategory(catId: string) {
    let next: string[]
    const isSelected = currentSelected.includes(catId)

    if (isSelected) {
      // Rimuovi se già presente (se non ne rimangono altre, possiamo consentire array vuoto o mantenere)
      next = currentSelected.filter((id) => id !== catId)
    } else {
      // Aggiungi
      next = [...currentSelected, catId]
    }

    if (onChange) {
      onChange(next)
    }
    if (onChangeSingle) {
      onChangeSingle(next[0] || catId)
    }
  }

  function handleCreate() {
    if (!newLabel.trim()) return
    try {
      const created = categoryService.addCategory(newLabel.trim(), selectedColor)
      // Seleziona subito la nuova categoria creata
      const next = [...currentSelected, created.id]
      if (onChange) onChange(next)
      if (onChangeSingle) onChangeSingle(created.id)
      setNewLabel('')
      setIsCreating(false)
      setLimitError(null)
    } catch (err: any) {
      setLimitError(err?.message || 'Bisogna cancellarne una per crearne una nuova')
    }
  }

  const colors = Object.keys(COLOR_PALETTE) as CategoryColorName[]

  return (
    <div>
      {/* Header bar con label, Nuova e Gestisci */}
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Tag className="w-3.5 h-3.5" />
          <span>{label}</span>
          <span className="text-[10px] font-normal text-slate-400 lowercase">
            (facoltativa)
          </span>
        </label>

        <div className="flex items-center space-x-3">
          {!isCreating && (
            <button
              type="button"
              onClick={() => {
                if (categories.length >= MAX_CATEGORIES) {
                  setLimitError('Bisogna cancellarne una per crearne una nuova')
                  return
                }
                setLimitError(null)
                setIsCreating(true)
              }}
              className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuova</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsManagerOpen(true)}
            className="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center space-x-1 transition"
            title="Gestisci nomi, colori ed elimina categorie"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Gestisci</span>
          </button>
        </div>
      </div>

      {limitError && (
        <div className="mb-2.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold">
          {limitError}
        </div>
      )}

      {/* Creazione Rapida Nuova Categoria */}
      {isCreating && (
        <div className="mb-3 p-3 rounded-2xl bg-teal-50/80 dark:bg-slate-800 border border-teal-200 dark:border-teal-800 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleCreate()
                } else if (e.key === 'Escape') {
                  setIsCreating(false)
                }
              }}
              placeholder="Nome categoria..."
              className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
              autoFocus
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newLabel.trim()}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs font-bold transition flex items-center space-x-1 shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salva</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Palette Colori */}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Colore:</span>
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              {colors.map((c) => {
                const conf = COLOR_PALETTE[c]
                const isPicked = selectedColor === c
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`w-5 h-5 rounded-full transition flex items-center justify-center ${
                      conf.dot
                    } ${
                      isPicked
                        ? 'ring-2 ring-offset-1 ring-slate-900 dark:ring-white scale-110'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    title={conf.label}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Lista Categorie a Pillole con Multi-Selezione */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const style = categoryService.getCategoryStyle(cat.id)
          const isSelected =
            currentSelected.includes(cat.id) ||
            currentSelected.some(
              (s) => s.toLowerCase() === cat.id.toLowerCase() || s.toLowerCase() === cat.label.toLowerCase()
            )

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggleCategory(cat.id)}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center space-x-2 border cursor-pointer select-none ${
                isSelected
                  ? `${style.badge} ring-2 ring-indigo-500 dark:ring-indigo-400 shadow-sm font-black`
                  : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${style.dot} shrink-0 ring-1 ring-white/50`}
              />
              <span>{cat.label}</span>

              {isSelected && (
                <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 stroke-[3]" />
              )}
            </button>
          )
        })}
      </div>

      {/* Modale Gestione Completa Categorie */}
      <CategoryManagerModal
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
      />
    </div>
  )
}
