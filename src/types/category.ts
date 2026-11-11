// src/types/category.ts
// Modelli dati per le categorie dinamiche dell'applicazione

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
