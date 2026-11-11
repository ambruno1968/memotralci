// src/services/categoryService.ts
// Gestione dinamica delle Categorie per Eventi e Attività (To-Do)

export type CategoryColorName =
  | 'indigo'
  | 'emerald'
  | 'purple'
  | 'sky'
  | 'amber'
  | 'rose'
  | 'teal'
  | 'slate'

export interface AppCategoryItem {
  id: string
  label: string
  color: CategoryColorName
  isDefault?: boolean
}

export interface CategoryStyle {
  bg: string
  text: string
  border: string
  dot: string
  label: string
  badge: string
  cardGradient: string
}

export const COLOR_PALETTE: Record<CategoryColorName, { label: string; badge: string; dot: string; border: string; bg: string; text: string; gradient: string }> = {
  teal: {
    label: 'Verde Acqua (Teal)',
    bg: 'bg-teal-50/90 dark:bg-teal-950/60',
    text: 'text-teal-800 dark:text-teal-200',
    border: 'border-teal-300 dark:border-teal-700/80',
    dot: 'bg-teal-600 dark:text-teal-400',
    badge: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/60 dark:text-teal-200',
    gradient: 'from-teal-500/10 to-teal-600/5',
  },
  emerald: {
    label: 'Smeraldo (Verde)',
    bg: 'bg-emerald-50/90 dark:bg-emerald-950/60',
    text: 'text-emerald-800 dark:text-emerald-200',
    border: 'border-emerald-300 dark:border-emerald-700/80',
    dot: 'bg-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-200',
    gradient: 'from-emerald-500/10 to-teal-600/5',
  },
  purple: {
    label: 'Uva / Viola',
    bg: 'bg-purple-50/90 dark:bg-purple-950/60',
    text: 'text-purple-800 dark:text-purple-200',
    border: 'border-purple-300 dark:border-purple-700/80',
    dot: 'bg-purple-600 dark:text-purple-400',
    badge: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/60 dark:text-purple-200',
    gradient: 'from-purple-500/10 to-pink-600/5',
  },
  indigo: {
    label: 'Indaco / Blu',
    bg: 'bg-indigo-50/90 dark:bg-indigo-950/60',
    text: 'text-indigo-800 dark:text-indigo-200',
    border: 'border-indigo-300 dark:border-indigo-700/80',
    dot: 'bg-indigo-600 dark:text-indigo-400',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/60 dark:text-indigo-200',
    gradient: 'from-indigo-500/10 to-indigo-600/5',
  },
  sky: {
    label: 'Azzurro (Cielo)',
    bg: 'bg-sky-50/90 dark:bg-sky-950/60',
    text: 'text-sky-800 dark:text-sky-200',
    border: 'border-sky-300 dark:border-sky-700/80',
    dot: 'bg-sky-600 dark:text-sky-400',
    badge: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/60 dark:text-sky-200',
    gradient: 'from-sky-500/10 to-blue-600/5',
  },
  amber: {
    label: 'Ambra / Arancio',
    bg: 'bg-amber-50/90 dark:bg-amber-950/60',
    text: 'text-amber-800 dark:text-amber-200',
    border: 'border-amber-300 dark:border-amber-700/80',
    dot: 'bg-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/60 dark:text-amber-200',
    gradient: 'from-amber-500/10 to-orange-600/5',
  },
  rose: {
    label: 'Rosso / Corallo',
    bg: 'bg-rose-50/90 dark:bg-rose-950/60',
    text: 'text-rose-800 dark:text-rose-200',
    border: 'border-rose-300 dark:border-rose-700/80',
    dot: 'bg-rose-600 dark:text-rose-400',
    badge: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/60 dark:text-rose-200',
    gradient: 'from-rose-500/10 to-red-600/5',
  },
  slate: {
    label: 'Grigio (Neutro)',
    bg: 'bg-slate-50/90 dark:bg-slate-800/60',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-700/80',
    dot: 'bg-slate-500 dark:text-slate-400',
    badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
    gradient: 'from-slate-500/10 to-slate-600/5',
  },
}

export const DEFAULT_CATEGORIES: AppCategoryItem[] = [
  { id: 'prog_vita', label: 'Prog,Vita', color: 'purple', isDefault: true },
  { id: 'segreteria', label: 'Segreteria', color: 'sky', isDefault: true },
  { id: 'chiesa', label: 'Chiesa', color: 'amber', isDefault: true },
  { id: 'missione', label: 'Missione', color: 'rose', isDefault: true },
  { id: 'giovani', label: 'Giovani', color: 'emerald', isDefault: true },
]

const STORAGE_KEY = 'memotralci_custom_categories_v2'
type Listener = (cats: AppCategoryItem[]) => void
const listeners = new Set<Listener>()

class CategoryService {
  private categories: AppCategoryItem[] = []

  constructor() {
    this.load()
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.categories = parsed
          return
        }
      }
    } catch {}
    // Inizializzazione con le nuove categorie default
    this.categories = DEFAULT_CATEGORIES.map((c) => ({ ...c }))
    this.save()
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.categories))
    } catch {}
    listeners.forEach((l) => l([...this.categories]))
  }

  public subscribe(listener: Listener): () => void {
    listeners.add(listener)
    listener([...this.categories])
    return () => {
      listeners.delete(listener)
    }
  }

  public getCategories(): AppCategoryItem[] {
    return [...this.categories]
  }

  public addCategory(label: string, color: CategoryColorName = 'teal'): AppCategoryItem {
    const trimmed = label.trim()
    const id = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 24) || `cat_${Date.now()}`

    // Se esiste già con questo ID, aggiornalo
    const existingIndex = this.categories.findIndex((c) => c.id === id)
    if (existingIndex >= 0) {
      this.categories[existingIndex].label = trimmed
      this.categories[existingIndex].color = color
      this.save()
      return this.categories[existingIndex]
    }

    const newCat: AppCategoryItem = {
      id,
      label: trimmed,
      color,
      isDefault: false,
    }
    this.categories.push(newCat)
    this.save()
    return newCat
  }

  public updateCategory(id: string, newLabel: string, newColor?: CategoryColorName): AppCategoryItem | null {
    const trimmed = newLabel.trim()
    if (!trimmed) return null

    const index = this.categories.findIndex((c) => c.id === id)
    if (index === -1) return null

    this.categories[index] = {
      ...this.categories[index],
      label: trimmed,
      color: newColor || this.categories[index].color,
    }

    this.save()
    return this.categories[index]
  }

  public deleteCategory(id: string): boolean {
    const prevLen = this.categories.length
    // Permette di eliminare qualsiasi categoria senza intaccare i task
    this.categories = this.categories.filter((c) => c.id !== id)
    if (this.categories.length !== prevLen) {
      this.save()
      return true
    }
    return false
  }

  public resetToDefaults(): AppCategoryItem[] {
    this.categories = DEFAULT_CATEGORIES.map((c) => ({ ...c }))
    this.save()
    return [...this.categories]
  }

  public getCategoryStyle(catIdOrName?: string): CategoryStyle {
    if (!catIdOrName) {
      const def = COLOR_PALETTE.teal
      return {
        bg: def.bg,
        text: def.text,
        border: def.border,
        dot: def.dot,
        label: 'Generale',
        badge: def.badge,
        cardGradient: def.gradient,
      }
    }

    const lower = catIdOrName.toLowerCase().trim()
    const match = this.categories.find(
      (c) => c.id.toLowerCase() === lower || c.label.toLowerCase() === lower
    )

    const colorKey = match?.color || 'teal'
    const conf = COLOR_PALETTE[colorKey] || COLOR_PALETTE.teal
    const label = match ? match.label : catIdOrName

    return {
      bg: conf.bg,
      text: conf.text,
      border: conf.border,
      dot: conf.dot,
      label,
      badge: conf.badge,
      cardGradient: conf.gradient,
    }
  }
}

export const categoryService = new CategoryService()

/**
 * Normalizza le categorie di un task o evento in un array di stringhe pulito.
 * Se non è impostata alcuna categoria, restituisce un array vuoto [] (categoria facoltativa).
 * Supporta sia il formato singolo (es. "prog_vita"), sia una lista separata da virgole,
 * sia un array esplicito `categories: string[]`.
 */
export function normalizeCategories(item?: { category?: string; categories?: string[] } | null): string[] {
  if (!item) return []
  const result: string[] = []

  if (Array.isArray(item.categories)) {
    for (const c of item.categories) {
      if (typeof c === 'string' && c.trim() && !result.includes(c.trim())) {
        result.push(c.trim())
      }
    }
  }

  if (typeof item.category === 'string' && item.category.trim()) {
    const parts = item.category.split(',').map((p) => p.trim()).filter(Boolean)
    for (const p of parts) {
      if (!result.includes(p)) {
        result.push(p)
      }
    }
  }

  return result
}

