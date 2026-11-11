// Configurazione Versione e Crediti MemoTralci
// Standard SemVer (Semantic Versioning 2.0.0)

export const APP_VERSION = 'v1.2.1'

export interface AppCredits {
  appName: string
  version: string
  releaseDate: string
  developedFor: string
  organization: string
  description: string
  copyright: string
  contactEmail: string
}

export const APP_CREDITS: AppCredits = {
  appName: 'MemoTralci',
  version: '1.2.1',
  releaseDate: '11 Novembre 2026',
  developedFor: 'Segreteria Come Tralci Novara',
  organization: 'Associazione Come Tralci - Novara',
  description: 'PWA Agenda, Gestione Attività (To-Do) & Archiviazione Allegati Google Drive',
  copyright: '© 2026 Come Tralci Novara. Tutti i diritti riservati.',
  contactEmail: 'segreteria.cometralcinovara@gmail.com',
}

