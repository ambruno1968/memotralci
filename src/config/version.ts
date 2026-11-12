// Configurazione Versione, Crediti e Storylog MemoTralci
// Standard SemVer (Semantic Versioning 2.0.0)

export const APP_VERSION = 'v2.1.0'

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

export interface StorylogEntry {
  version: string
  date: string
  title: string
  type: 'major' | 'minor' | 'patch'
  changes: string[]
}

export const APP_CREDITS: AppCredits = {
  appName: 'MemoTralci',
  version: '2.1.0',
  releaseDate: '12 Novembre 2026',
  developedBy: 'Bruno Astemio (bam@68)',
  developedFor: 'Segreteria Come Tralci Novara',
  organization: 'Come Tralci - Novara',
  description: 'PWA Agenda, Gestione Attività (To-Do) & Archiviazione Allegati Google Drive',
  copyright: '© 2026 Come Tralci Novara • Sviluppato da Bruno Astemio (bam@68)',
  contactEmail: 'segreteria.cometralcinovara@gmail.com',
}

export const APP_STORYLOG: StorylogEntry[] = [
  {
    version: '2.1.0',
    date: '12/11/2026',
    title: 'Categorie Indipendenti per Documenti & Allegati e Aggiornamento Denominazione',
    type: 'minor',
    changes: [
      'Aggiunte le Categorie anche in "Gestione Allegati & Documenti", completamente indipendenti da task ed eventi: ogni documento può avere una o più categorie assegnate, modificate e filtrate.',
      'Sincronizzazione cloud delle categorie dei documenti tramite appProperties su Google Drive e salvataggio in locale su IndexedDB.',
      'Aggiornata la denominazione ufficiale in "Come Tralci - Novara" rimuovendo la parola "Associazione" da tutti i riferimenti.',
    ],
  },
  {
    version: '2.0.3',
    date: '12/11/2026',
    title: 'Sincronizzazione Multi-Calendario da Google Calendar verso MemoTralci',
    type: 'patch',
    changes: [
      'Lettura unificata da tutti i calendari Google rilevanti (sia "Segreteria" sia il calendario principale "primary"), così ogni impegno creato direttamente su Google Calendar da telefono o web appare subito anche su MemoTralci.',
      'Gestione intelligente di modifica ed eliminazione con tracciamento dell\'ID calendario di origine (calendarId) e fallback automatico.',
      'Avviso esplicito durante la sincronizzazione manuale se il token Google richiede un rinnovo.',
    ],
  },
  {
    version: '2.0.2',
    date: '12/11/2026',
    title: 'Ottimizzazione Responsive Mobile per Schermi Stretti e Corti',
    type: 'patch',
    changes: [
      'Aggiunto supporto nativo safe-area (safe-top, safe-bottom, safe-x) alla testata e alle barre fisse per evitare il taglio superiore sotto la status bar/notch in modalità PWA.',
      'Ottimizzati spaziature, pulsanti e selettori vista (Giorno, Mese, Settimana, Agenda) per adattarsi perfettamente anche a smartphone con schermo stretto (320px–375px) senza sbordamenti laterali.',
      'Adattate tutte le finestre modali con altezza dinamica (88dvh) e celle calendario compatte per evitare tagli su smartphone con display più corto.',
    ],
  },
  {
    version: '2.0.1',
    date: '12/11/2026',
    title: 'Connessione Google/Drive Permanente in Locale e Persistenza Completa Eventi in Agenda',
    type: 'patch',
    changes: [
      'Memorizzazione permanente in locale (localStorage + IndexedDB) dell\'account Google e del Refresh Token OAuth2: la connessione a Google Drive e Calendar non si sgancia più dopo ore o giorni di inattività.',
      'Rinnovo automatico diretto via HTTPS (grant_type=refresh_token) senza popup e rimozione dello scollegamento forzato in caso di scadenza oraria del token.',
      'Risolta la scomparsa dalla vista Agenda/Calendario degli eventi salvati su Google Calendar: esteso l\'orizzonte di lettura fino a 5 anni nel futuro (fino a 2500 eventi per pagina con paginazione completa), aggiunto buffer locale anti-latenza e gestione nativa delle date per eventi Tutto il giorno.',
    ],
  },
  {
    version: '2.0.0',
    date: '11/11/2026',
    title: 'Major Release 2.0: Vista Giornaliera (Oggi), Condivisione WhatsApp con Logo e Agenda Futura',
    type: 'major',
    changes: [
      'Nuova Vista Giornaliera ("Giorno" / "Oggi"): cliccando su "Oggi" o su "Giorno" (o sul numero di qualsiasi giorno nel calendario) si apre il programma dettagliato del singolo giorno con eventi e scadenze.',
      'Condivisione Eventi e Giornata su WhatsApp con Logo: nuovo pannello di condivisione elegante con anteprima grafica, messaggio formattato per WhatsApp e generazione automatica della locandina PNG ad alta risoluzione con il logo Come Tralci, data, orario e testo dell\'evento.',
      'Agenda Intelligente "Da Oggi in Poi": la vista Agenda mostra esclusivamente gli eventi a partire dalla data odierna in avanti, nascondendo automaticamente gli eventi passati.',
    ],
  },
  {
    version: '1.2.6',
    date: '11/11/2026',
    title: 'Allineamento Categorie Multi-Dispositivo (PC & Smartphone) e Storylog',
    type: 'patch',
    changes: [
      'Risolto conflitto permessi OAuth drive.file sulla cartella Drive con fallback automatico e ricerca globale di _categories.json.',
      'Doppio canale di sincronizzazione categorie (Google Drive + Metadati Google Calendar) con controllo versione basato su timestamp (updatedAt) e merge intelligente.',
      'Rimosso vecchio fallback forzato "altro" sugli eventi di Google Calendar e sincronizzato l\'array completo delle categorie.',
      'Rimosso il pulsante "+ Nuovo Evento" dalla barra superiore per un\'interfaccia più pulita.',
      'Aggiunto Storylog (storico versioni e modifiche) consultabile direttamente dall\'app e nel repository.',
    ],
  },
  {
    version: '1.2.5',
    date: '11/11/2026',
    title: 'Crediti Ufficiali, Sincronizzazione Cloud Categorie e Pulizia Automatica Cache',
    type: 'patch',
    changes: [
      'Aggiornati i crediti ufficiali: Sviluppato da Bruno Astemio (bam@68).',
      'Introdotta persistenza cloud per le categorie su Google Drive (_categories.json).',
      'Pulizia automatica della cache (Service Worker CacheStorage, IndexedDB file temporanei e cache ID) all\'accesso e alla sincronizzazione.',
    ],
  },
  {
    version: '1.2.4',
    date: '11/11/2026',
    title: 'Modale Logo Ingrandito, Piccola Wiki e Crediti',
    type: 'patch',
    changes: [
      'Cliccando sull\'icona di MemoTralci in alto a sinistra si apre il pannello con logo ingrandito, versione SemVer, Piccola Wiki di guida rapida e Crediti.',
    ],
  },
  {
    version: '1.2.3',
    date: '11/11/2026',
    title: 'Scatti Orario a 5 Minuti e Controllo Orario di Fine Evento',
    type: 'patch',
    changes: [
      'Impostato il selettore dei minuti del calendario a passi di 5 minuti (00, 05, 10, 15...).',
      'Vincolato l\'orario di fine evento ad essere sempre uguale o successivo all\'orario di inizio con adeguamento automatico.',
    ],
  },
  {
    version: '1.2.2',
    date: '11/11/2026',
    title: 'Categorie Facoltative e Filtro "Senza categoria"',
    type: 'patch',
    changes: [
      'Rimossa la preselezione obbligatoria di una categoria di default su nuovi eventi e attività.',
      'Aggiunto il filtro rapido "Senza categoria" nel Calendario e nelle Cose da Fare.',
    ],
  },
  {
    version: '1.2.1',
    date: '11/11/2026',
    title: 'Sessione Google Persistente e Silent Token Refresh',
    type: 'patch',
    changes: [
      'Implementato il rinnovo silenzioso automatico del token OAuth Google in background prima della scadenza oraria.',
      'Aggiunto intercettore automatico sugli errori HTTP 401 con retry trasparente e controllo al ritorno in primo piano dell\'app.',
    ],
  },
  {
    version: '1.2.0',
    date: '11/11/2026',
    title: 'Gestione Completa Categorie, Multi-Categoria e Cancellazione Fisica Allegati',
    type: 'minor',
    changes: [
      'Nuove categorie predefinite: Prog,Vita, Segreteria, Chiesa, Missione, Giovani.',
      'Possibilità di creare, rinominare, cambiare colore ed eliminare qualsiasi categoria senza perdere i task o gli eventi associati.',
      'Supporto all\'assegnazione di più categorie contemporaneamente su ogni evento o attività.',
      'Cancellazione fisica automatica degli allegati da Google Drive quando viene rimosso un allegato o eliminato il task/evento collegato.',
    ],
  },
  {
    version: '1.1.1',
    date: '10/11/2026',
    title: 'Categorie Personalizzabili, Drag & Drop e Tombstone Task',
    type: 'patch',
    changes: [
      'Introdotto selettore colori per le categorie, caricamento allegati Drag & Drop e registro locale dei task eliminati (tombstones).',
    ],
  },
  {
    version: '1.1.0',
    date: '10/11/2026',
    title: 'Sincronizzazione Multi-Dispositivo Task su Google Drive',
    type: 'minor',
    changes: [
      'Archiviazione cloud delle Cose da Fare nella sottocartella Archivio_Task su Google Drive.',
      'Filtro intelligente per mostrare nella vista Allegati solo i file reali caricati dall\'utente.',
    ],
  },
  {
    version: '1.0.0',
    date: '10/11/2026',
    title: 'Primo Rilascio MemoTralci PWA',
    type: 'major',
    changes: [
      'Applicazione PWA installabile su PC, Android e iOS con supporto Offline-First (IndexedDB) e Tema Chiaro/Scuro.',
      'Integrazione diretta client-side con Google Calendar ("Segreteria") e Google Drive ("Allegati memotralci").',
      'Registrazione note vocali dal microfono, ricerca rapida (Ctrl+K) ed esportazione calendario ICS / Backup JSON.',
    ],
  },
]
