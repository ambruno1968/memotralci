// src/services/categoryService.ts
// Gestione dinamica delle Categorie per Eventi e Attività (To-Do)
// Sincronizzazione automatica bidirezionale multi-dispositivo (Google Drive + Google Calendar Metadata Mirror)

export type { CategoryColorName, AppCategoryItem, CategoriesCloudPayload } from '../types/category.ts'
import type { CategoryColorName, AppCategoryItem, CategoriesCloudPayload } from '../types/category.ts'
import { googleClientSide } from './googleClientSide.ts'

export interface CategoryStyle {
  bg: string
  text: string
  border: string
  dot: string
  label: string
  badge: string
  cardGradient: string
}

export const COLOR_PALETTE: Record<
  CategoryColorName,
  { label: string; badge: string; dot: string; border: string; bg: string; text: string; gradient: string }
> = {
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
const META_STORAGE_KEY = 'memotralci_categories_meta_v2'

type Listener = (cats: AppCategoryItem[]) => void
const listeners = new Set<Listener>()

function isSameAsDefaults(cats: AppCategoryItem[]): boolean {
  if (!Array.isArray(cats) || cats.length !== DEFAULT_CATEGORIES.length) return false
  return cats.every((c, idx) => {
    const def = DEFAULT_CATEGORIES[idx]
    return def && c.id === def.id && c.label === def.label && c.color === def.color
  })
}

class CategoryService {
  private categories: AppCategoryItem[] = []
  private updatedAt: number = 0
  private deletedIds: string[] = []
  private explicitReset: boolean = false
  private syncPromise: Promise<AppCategoryItem[]> | null = null

  constructor() {
    this.load()
  }

  private load() {
    let loadedCats: AppCategoryItem[] | null = null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedCats = parsed.filter((c) => c && typeof c.id === 'string' && typeof c.label === 'string')
        }
      }
    } catch {}

    try {
      const rawMeta = localStorage.getItem(META_STORAGE_KEY)
      if (rawMeta) {
        const meta = JSON.parse(rawMeta)
        this.updatedAt = Number(meta.updatedAt || 0)
        this.deletedIds = Array.isArray(meta.deletedIds) ? meta.deletedIds : []
        this.explicitReset = Boolean(meta.explicitReset)
      }
    } catch {}

    if (loadedCats && loadedCats.length > 0) {
      this.categories = loadedCats
      // Se l'utente aveva già personalizzato le categorie in v1.2.4/v1.2.5 ma non aveva ancora il timestamp meta:
      if (this.updatedAt === 0 && !isSameAsDefaults(this.categories)) {
        this.updatedAt = Date.now()
        const currentIds = new Set(this.categories.map((c) => c.id))
        this.deletedIds = DEFAULT_CATEGORIES.filter((d) => !currentIds.has(d.id)).map((d) => d.id)
        this.saveMeta()
      }
      return
    }

    // Inizializzazione con le categorie default (updatedAt = 0 così cede sempre il passo a eventuali personalizzazioni cloud)
    this.categories = DEFAULT_CATEGORIES.map((c) => ({ ...c }))
    this.updatedAt = 0
    this.deletedIds = []
    this.explicitReset = false
    this.save(false)
  }

  private saveMeta() {
    try {
      localStorage.setItem(
        META_STORAGE_KEY,
        JSON.stringify({
          updatedAt: this.updatedAt,
          deletedIds: this.deletedIds,
          explicitReset: this.explicitReset,
        })
      )
    } catch {}
  }

  private buildPayload(): CategoriesCloudPayload {
    return {
      version: 2,
      updatedAt: this.updatedAt,
      categories: [...this.categories],
      deletedIds: [...this.deletedIds],
      explicitReset: this.explicitReset,
    }
  }

  private save(syncCloud = true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.categories))
      this.saveMeta()
    } catch {}
    listeners.forEach((l) => l([...this.categories]))

    if (syncCloud && googleClientSide.isConnected()) {
      googleClientSide.saveDriveCategories(this.buildPayload()).catch((e) => {
        console.warn('[CategoryService] Errore salvataggio automatico categorie nel cloud:', e)
      })
    }
  }

  /**
   * Sincronizza bidirezionalmente le categorie con il Cloud (Google Drive + Google Calendar Metadata Mirror):
   * - Evita chiamate concorrenti (mutex syncPromise)
   * - Confronta updatedAt locale e remoto così le categorie personalizzate non vengono mai sovrascritte
   *   dalle categorie predefinite di un dispositivo non ancora allineato.
   */
  public async syncWithDrive(): Promise<AppCategoryItem[]> {
    if (!googleClientSide.isConnected()) {
      return [...this.categories]
    }

    if (this.syncPromise) {
      return this.syncPromise
    }

    this.syncPromise = (async () => {
      try {
        const cloudPayload = await googleClientSide.getDriveCategories()

        if (cloudPayload && Array.isArray(cloudPayload.categories) && cloudPayload.categories.length > 0) {
          const validCloudCats = cloudPayload.categories.filter(
            (c) => c && typeof c.id === 'string' && typeof c.label === 'string'
          )

          if (validCloudCats.length > 0) {
            const cloudIsUntouchedDefault =
              isSameAsDefaults(validCloudCats) && !cloudPayload.explicitReset && cloudPayload.updatedAt === 0
            const effectiveCloudUpdatedAt = cloudIsUntouchedDefault
              ? 0
              : cloudPayload.updatedAt > 0
                ? cloudPayload.updatedAt
                : !isSameAsDefaults(validCloudCats)
                  ? 1000
                  : 0

            if (effectiveCloudUpdatedAt > this.updatedAt) {
              // Il Cloud ha una versione più recente delle categorie: adottala sul dispositivo
              const mergedDeleted = Array.from(
                new Set([...(cloudPayload.deletedIds || []), ...this.deletedIds])
              )
              const mergedCats = [...validCloudCats]

              // Se anche questo dispositivo aveva categorie custom create localmente e non eliminate, uniscile
              if (this.updatedAt > 0 && !cloudPayload.explicitReset) {
                const cloudIds = new Set(mergedCats.map((c) => c.id))
                for (const localCat of this.categories) {
                  if (!localCat.isDefault && !cloudIds.has(localCat.id) && !mergedDeleted.includes(localCat.id)) {
                    mergedCats.push(localCat)
                  }
                }
              }

              this.categories = mergedCats
              this.updatedAt = effectiveCloudUpdatedAt
              this.deletedIds = cloudPayload.deletedIds || []
              this.explicitReset = Boolean(cloudPayload.explicitReset)
              this.save(false)
              return [...this.categories]
            } else if (this.updatedAt > effectiveCloudUpdatedAt) {
              // Questo dispositivo ha personalizzazioni più recenti rispetto al Cloud: aggiorna il Cloud
              await googleClientSide.saveDriveCategories(this.buildPayload())
              return [...this.categories]
            }
          }
        } else if (this.categories.length > 0) {
          // Nessun file nel Cloud: carica lo stato corrente
          await googleClientSide.saveDriveCategories(this.buildPayload())
        }
      } catch (e) {
        console.warn('[CategoryService] Errore durante syncWithDrive:', e)
      } finally {
        this.syncPromise = null
      }

      return [...this.categories]
    })()

    return this.syncPromise
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

  public hasCategory(idOrLabel: string): boolean {
    const lower = idOrLabel.toLowerCase().trim()
    return this.categories.some((c) => c.id.toLowerCase() === lower || c.label.toLowerCase() === lower)
  }

  public addCategory(label: string, color: CategoryColorName = 'teal'): AppCategoryItem {
    const trimmed = label.trim()
    const id =
      trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 24) || `cat_${Date.now()}`

    this.deletedIds = this.deletedIds.filter((d) => d !== id)
    this.explicitReset = false
    this.updatedAt = Date.now()

    // Se esiste già con questo ID, aggiornalo
    const existingIndex = this.categories.findIndex((c) => c.id === id)
    if (existingIndex >= 0) {
      this.categories[existingIndex].label = trimmed
      this.categories[existingIndex].color = color
      this.save(true)
      return this.categories[existingIndex]
    }

    const newCat: AppCategoryItem = {
      id,
      label: trimmed,
      color,
      isDefault: false,
    }
    this.categories.push(newCat)
    this.save(true)
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

    this.explicitReset = false
    this.updatedAt = Date.now()
    this.save(true)
    return this.categories[index]
  }

  public deleteCategory(id: string): boolean {
    const prevLen = this.categories.length
    // Permette di eliminare qualsiasi categoria senza intaccare i task
    this.categories = this.categories.filter((c) => c.id !== id)
    if (this.categories.length !== prevLen) {
      if (!this.deletedIds.includes(id)) {
        this.deletedIds.push(id)
      }
      this.explicitReset = false
      this.updatedAt = Date.now()
      this.save(true)
      return true
    }
    return false
  }

  public resetToDefaults(): AppCategoryItem[] {
    this.categories = DEFAULT_CATEGORIES.map((c) => ({ ...c }))
    this.deletedIds = []
    this.explicitReset = true
    this.updatedAt = Date.now()
    this.save(true)
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
 * Ignora l'etichetta legacy "altro" se non è stata creata esplicitamente come categoria.
 */
export function normalizeCategories(item?: { category?: string; categories?: string[] } | null): string[] {
  if (!item) return []
  const result: string[] = []

  const isLegacyAltro = (val: string) =>
    val.toLowerCase() === 'altro' && !categoryService.hasCategory('altro')

  if (Array.isArray(item.categories)) {
    for (const c of item.categories) {
      if (typeof c === 'string' && c.trim() && !isLegacyAltro(c.trim()) && !result.includes(c.trim())) {
        result.push(c.trim())
      }
    }
  }

  if (typeof item.category === 'string' && item.category.trim()) {
    const parts = item.category
      .split(',')
      .map((p) => p.trim())
      .filter((p) => Boolean(p) && !isLegacyAltro(p))
    for (const p of parts) {
      if (!result.includes(p)) {
        result.push(p)
      }
    }
  }

  return result
}
