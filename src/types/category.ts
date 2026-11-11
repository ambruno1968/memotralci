// src/types/category.ts
// Modelli dati per le categorie dinamiche dell'applicazione e sincronizzazione Cloud

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

export interface CategoriesCloudPayload {
  version: number
  updatedAt: number
  categories: AppCategoryItem[]
  deletedIds?: string[]
  explicitReset?: boolean
}
