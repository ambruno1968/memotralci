// Configurazione Versione e Crediti MemoTralci
// Standard SemVer (Semantic Versioning 2.0.0)

export const APP_VERSION = 'v1.2.5'

export interface AppCredits {
  appName: string
  version: string
  releaseDate: string
  developedBy: string
  developedFor: string
  organization: string
  description: string
  copyright: string
  contactEmail: string
}

export const APP_CREDITS: AppCredits = {
  appName: 'MemoTralci',
  version: '1.2.5',
  releaseDate: '11 Novembre 2026',
  developedBy: 'Bruno Astemio (bam@68)',
  developedFor: 'Segreteria Come Tralci Novara',
  organization: 'Associazione Come Tralci - Novara',
  description: 'PWA Agenda, Gestione Attività (To-Do) & Archiviazione Allegati Google Drive',
  copyright: '© 2026 Come Tralci Novara • Sviluppato da Bruno Astemio (bam@68)',
  contactEmail: 'segreteria.cometralcinovara@gmail.com',
}
