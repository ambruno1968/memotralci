import React, { useState, useEffect } from 'react'
import { Plus, X, Tag, Check } from 'lucide-react'
import {
  categoryService,
  COLOR_PALETTE,
  type AppCategoryItem,
  type CategoryColorName,
} from '../services/categoryService.ts'

interface CategoryPickerProps {
  value: string
  onChange: (category: string) => void
  label?: string
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  value,
  onChange,
  label = 'Categoria',
}) => {
  const [categories, setCategories] = useState<AppCategoryItem[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [selectedColor, setSelectedColor] = useState<CategoryColorName>('teal')

  useEffect(() => {
    return categoryService.subscribe((cats) => {
      setCategories(cats)
    })
  }, [])

  function handleCreate() {
    if (!newLabel.trim()) return
    const created = categoryService.addCategory(newLabel.trim(), selectedColor)
    onChange(created.id)
    setNewLabel('')
    setIsCreating(false)
  }

  function handleDelete(catId: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (confirm('Vuoi eliminare questa categoria personalizzata?')) {
      categoryService.deleteCategory(catId)
      if (value === catId) {
        onChange('lavoro')
      }
    }
  }

  const colors = Object.keys(COLOR_PALETTE) as CategoryColorName[]

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Tag className="w-3.5 h-3.5" />
          <span>{label}</span>
        </label>

        {!isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuova Categoria</span>
          </button>
        )}
      </div>

      {/* Creazione Rapida Nuova Categoria */}
      {isCreating && (
        <div className="mb-2.5 p-3 rounded-2xl bg-teal-50/80 dark:bg-slate-800 border border-teal-200 dark:border-teal-800 space-y-2.5 animate-in fade-in duration-150">
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
              placeholder="Nome categoria (es. Vendemmia, Cantina...)"
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
                    } ${isPicked ? 'ring-2 ring-offset-1 ring-slate-900 dark:ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
                    title={conf.label}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Lista Categorie a Pillole */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => {
          const style = categoryService.getCategoryStyle(cat.id)
          const isSelected = value.toLowerCase() === cat.id.toLowerCase() || value.toLowerCase() === cat.label.toLowerCase()

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange(cat.id)}
              className={`group relative py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 border ${
                isSelected
                  ? `${style.badge} ring-2 ring-teal-500 shadow-xs border-transparent`
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${style.dot} shrink-0`} />
              <span>{cat.label}</span>

              {/* Tasto elimina per categorie personalizzate create dall'utente */}
              {!cat.isDefault && (
                <span
                  onClick={(e) => handleDelete(cat.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition ml-1"
                  title="Elimina categoria"
                >
                  <X className="w-3 h-3" />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

