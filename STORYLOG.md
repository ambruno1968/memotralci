# 📖 Storylog & Changelog — MemoTralci

**Applicazione:** MemoTralci — Agenda, Note & Allegati  
**Organizzazione:** Come Tralci - Novara (*Segreteria Come Tralci Novara*)  
**Sviluppato da:** **Bruno Astemio (bam@68)**  
**Standard di Versionamento:** [SemVer 2.0.0](https://semver.org/lang/it/)

---

## [v2.3.0] — 12 Novembre 2026
### ✨ Nuova Sezione Note (Post-it), Fix Modalità Scura, Multi-giorno & Sync Esclusivo `_categories.json`
- **Sezione Note (Post-it):**
  - Nuova bacheca Post-it con 6 colori pastello, angolo piegato, fissaggio in alto (`Pin`), creazione rapida e categorizzazione uniformata con salvataggio su `IndexedDB` e Google Drive (`_notes.json`).
- **Fix Modalità Scura & UI:**
  - Corretto il gradiente dell'intestazione delle modali (`dark:via-slate-900`) per garantire massima leggibilità in modalità scura.
- **Eventi Multi-giorno & Eliminazione:**
  - In Agenda e Vista Giorno gli eventi di più giorni mostrano ora chiaramente data e ora di inizio e di fine (`Dal ... al ...`).
  - Conferma inline per l'eliminazione degli eventi e rimozione immediata dalla vista.
- **Categorie Esclusive su `_categories.json` & Limite Massimo:**
  - Rimosso il mirror su Google Calendar; lettura e scrittura avvengono esclusivamente sul file `_categories.json` su Drive con `cache: 'no-store'`, cartella dedicata `Archivio_Note` su Drive e limite massimo a 15 categorie.

---

## [v2.2.2] — 12 Novembre 2026
### 🎨 Pulizia Testata Superiore
- Rimossi il sottotitolo e il badge della versione dalla testata superiore, lasciando solo il **logo** e **MemoTralci** (la versione resta visibile nel footer in basso).

---

## [v2.2.1] — 12 Novembre 2026
### 🎨 Uniformazione Selettore Filtro Categorie
- Uniformato il filtro categorie tra **Agenda & Calendario**, **Cose da Fare** e **Gestione Allegati & Documenti** utilizzando lo stesso menu a tendina compatto (`Tutte le categorie` / `Senza categoria`).

---

## [v2.2.0] — 12 Novembre 2026
### ✨ Scadenze Imminenti, Anteprima PDF/Multi-formato, Sync Categorie Task-Allegati & Riorganizzazione Drive
- **Scadenze & Impegni Imminenti:**
  - Nuovo elenco richiamabile dal pulsante campanella in testata (con apertura automatica se sono presenti impegni o task per **domani**), suddiviso in *Domani*, *Task scaduti*, *Questa Settimana*, *Settimana Prossima* e *Task senza scadenza*.
- **Sincronizzazione Bidirezionale Categorie Task ↔ Allegati:**
  - Gli allegati associati a un task ereditano e aggiornano automaticamente la categoria del task (e restano senza categoria finché non viene impostata); modificando la categoria dell'allegato si aggiorna anche il task collegato.
- **Anteprima PDF e Principali Formati:**
  - Risolto il download forzato dei PDF usando Blob autenticati e Google Drive `/preview`, con supporto inline anche per immagini, video, audio, tabelle CSV, testo/JSON/MD e documenti Office.
- **Riorganizzazione Cartella Google Drive (zero perdita collegamenti):**
  - Consolidamento su un unico file `_categories.json` e separazione automatica in `Archivio_Allegati` e `Archivio_Note_Vocali` preservando gli ID e i link esistenti.

---

## [v2.1.0] — 12 Novembre 2026
### ✨ Categorie Indipendenti per Documenti & Allegati e Aggiornamento Denominazione
- **Categorie su Documenti e Allegati (`Gestione Allegati & Documenti`):**
  - Aggiunta la barra dei filtri per **Categorie** (*Tutte*, *Senza categoria* e categorie personalizzate) nella sezione Documenti.
  - Ogni scheda documento mostra i badge delle categorie assegnate e dispone del pulsante **Categorie** per assegnare, modificare, creare o gestire le categorie del file indipendentemente da task ed eventi.
  - Le categorie dei documenti vengono salvate sia in locale (`IndexedDB`) sia nei metadati `appProperties` di **Google Drive** per la sincronizzazione tra dispositivi.
- **Denominazione:**
  - Rimossa la parola *"Associazione"* da tutti i riferimenti nel progetto, mantenendo **"Come Tralci - Novara"**.

---

## [v2.0.3] — 12 Novembre 2026
### 🔄 Sincronizzazione Completa Impegni Creati Direttamente su Google Calendar
- **Lettura unificata multi-calendario (`Segreteria` + `primary`):**
  - Risolto il problema per cui un impegno creato direttamente sull'app o sito Google Calendar (che di default salva sul calendario principale `primary`) non appariva in MemoTralci quando quest'ultimo puntava al solo calendario secondario `"Segreteria"` (o viceversa).
  - Ora `getCalendarEvents()` interroga in parallelo tutti i calendari rilevanti (`Segreteria` e `primary`, deduplicando per ID evento), rendendo visibile in MemoTralci qualsiasi impegno creato direttamente su Google Calendar.
  - Aggiunto supporto `calendarId` su modifica/eliminazione eventi e avviso chiaro in caso di sessione scaduta durante il sync manuale.

---

## [v2.0.2] — 12 Novembre 2026
### 📱 Ottimizzazione Responsive Mobile per Schermi Stretti e Corti
- **Testata (`Navbar`) e Safe Area PWA (`safe-top`, `safe-bottom`, `safe-x`):**
  - Aggiunto il rispetto automatico delle aree sicure superiori, inferiori e laterali (`env(safe-area-inset-*)`) per evitare che la barra di stato o il notch del telefono coprano la parte alta della testata.
  - Compattati spaziatura, logo, badge versione e pulsanti rapidi in testata per schermi stretti (`320px–375px`).
- **Selettori Calendario, Griglie e Task senza tagli laterali:**
  - I 4 selettori vista (*Giorno, Mese, Settimana, Agenda*) e i filtri attività (*Da fare, Completate, Tutte*) sono ora disposti in griglia fluida su mobile, evitando qualsiasi taglio sul bordo destro.
  - Celle della vista mensile ridimensionate per display più corti e scorrimento fluido per la vista settimanale.
- **Finestre Modali e Altezza Dinamica (`dvh`):**
  - Tutte le modali utilizzano ora `max-h-[88dvh]` con testata e piè di pagina compatti e bloccati (`shrink-0`), mantenendo sempre visibili i pulsanti di salvataggio e chiusura anche sugli schermi più bassi.

---

## [v2.0.1] — 12 Novembre 2026
### 🛠️ Fix Connessione Permanente Account Google/Drive e Persistenza Eventi in Agenda
- **Memorizzazione permanente dell'account Google in locale (`localStorage` + `IndexedDB`):**
  - Risolto il problema per cui dopo alcune ore di inattività la connessione a Google Drive e Calendar si sganciava (causato dalla scadenza oraria dell'`access_token` combinata con la chiamata a `clearToken()` sui `401`).
  - L'account utente e il `refresh_token` OAuth2 sono ora salvati in modo permanente sia in `localStorage` sia nello store dedicato `authSession` di `IndexedDB`, e il rinnovo avviene via richiesta diretta HTTPS (`grant_type=refresh_token` verso `oauth2.googleapis.com/token`) senza alcun popup e senza mai scollegare l'account.
- **Risolta la scomparsa dalla vista Agenda/Calendario degli eventi salvati su Google Calendar:**
  - Esteso l'intervallo di lettura di Google Calendar da `180 giorni` a **5 anni nel futuro** (`-365 giorni` / `+1825 giorni`) con `maxResults=2500` e paginazione completa (`nextPageToken`), così gli eventi programmati nei mesi/anni successivi (es. Giugno/Settembre 2027) non vengono più rimossi dalla vista al primo ciclo di sincronizzazione.
  - Rimosso il controllo sincrono bloccante `getToken()` in `createCalendarEvent`, aggiunto buffer locale anti-latenza per gli eventi appena creati/modificati e gestione nativa di `end.date` esclusivo per gli eventi *Tutto il giorno*.

---

## [v2.0.0] — 11 Novembre 2026
### 🚀 Major Release 2.0: Vista Giornaliera (Oggi), Condivisione WhatsApp con Logo e Agenda Futura
- **Suddivisione Calendario per OGGI / Giorno (`day`):**
  - Cliccando sul pulsante **"Oggi"** (o sul selettore **"Giorno"**, oppure sul numero di qualsiasi giorno nella griglia mensile/settimanale) si apre la vista dedicata al singolo giorno selezionato, con frecce `<` e `>` per scorrere di giorno in giorno.
- **Condivisione Eventi da Agenda o da Giorno (WhatsApp + Locandina PNG con Logo):**
  - Ogni evento nelle viste *Giorno* e *Agenda* (oltre all'intera giornata) dispone del pulsante **Condividi** che apre una scheda elegante con il **Logo Come Tralci**, **Data, Orario e Testo dell'evento**.
  - Permette l'invio diretto su **WhatsApp** con formattazione elegante, la condivisione/download della **Card grafica PNG con il logo Come Tralci**, o la copia rapida del testo.
- **Agenda da Oggi in Poi:**
  - La vista **Agenda** mostra ora esclusivamente gli eventi da oggi in avanti, nascondendo automaticamente gli eventi passati.

---

## [v1.2.6] — 11 Novembre 2026
### 🛠️ Fix Sincronizzazione Categorie Multi-Dispositivo (PC & Smartphone) e Storylog
- **Risoluzione limite permessi `drive.file` su cartelle preimpostate:** aggiunto fallback automatico per la creazione/aggiornamento di `_categories.json` e dei file JSON su Google Drive qualora la cartella cablata restituisca `404` con lo scope `drive.file`, più ricerca globale del file `_categories.json` ordinata per `modifiedTime desc`.
- **Doppio canale Cloud (Google Drive + Metadati Google Calendar):** le categorie vengono ora sincronizzate sia tramite `_categories.json` su Google Drive sia tramite metadati condivisi sul calendario Google *Segreteria*, garantendo l'allineamento immediato al 100% tra PC e smartphone.
- **Controllo versione con `updatedAt` e Merge intelligente:** introdotto payload versionato (`CategoriesCloudPayload` con `updatedAt` e `deletedIds`). Le categorie personalizzate non vengono mai sovrascritte dalle categorie base di un dispositivo appena aperto; vince sempre la modifica più recente.
- **Rimozione fallback forzato `"altro"` sugli Eventi Google Calendar:** corretta la lettura e scrittura di `extendedProperties` negli eventi di Google Calendar, eliminando l'etichetta residua `"altro"` sugli eventi senza categoria e sincronizzando l'array completo `categories`.
- **Pulizia barra superiore:** rimosso il pulsante `+ Nuovo Evento` dalla barra di navigazione superiore.
- **Storylog integrato:** aggiunta la cronologia delle versioni sia in `STORYLOG.md` sia direttamente nell'interfaccia dell'app (cliccando sul logo in alto a sinistra).

---

## [v1.2.5] — 11 Novembre 2026
### ✨ Crediti Ufficiali, Persistenza Cloud Categorie e Pulizia Automatica Cache
- **Crediti sviluppatore:** inserito ufficialmente *Sviluppato da: Bruno Astemio (bam@68)* nel pannello Informazioni, nelle impostazioni e nel footer.
- **Sincronizzazione Categorie su Drive:** introdotta la lettura/scrittura di `_categories.json` su Google Drive (escludendolo dalla lista degli allegati utente).
- **Pulizia Automatica Cache (`clearAppCaches`):** svuotamento automatico del `CacheStorage` (Service Worker / Workbox), dei file temporanei in `IndexedDB` e degli ID in cache ad ogni accesso e sincronizzazione manuale.

---

## [v1.2.4] — 11 Novembre 2026
### ✨ Modale Logo Ingrandito, Piccola Wiki e Crediti
- Cliccando sull'icona di MemoTralci nella barra di navigazione superiore si apre una finestra dedicata con il logo ingrandito, la versione corrente, una **Piccola Wiki** (guida rapida in 6 punti) e la scheda **Crediti & Note**.

---

## [v1.2.3] — 11 Novembre 2026
### ✨ Scatti Orario a 5 Minuti e Vincolo Orario di Fine Evento
- **Passo di 5 minuti:** il selettore dell'orario degli eventi propone i minuti a scatti di 5 (`00, 05, 10, 15...`) anziché di 1 minuto.
- **Orario di fine coerente:** l'orario di fine evento è vincolato ad essere sempre uguale o successivo all'orario di inizio, adeguandosi automaticamente se l'inizio viene spostato in avanti.

---

## [v1.2.2] — 11 Novembre 2026
### ✨ Categorie Facoltative
- Rimossa l'assegnazione forzata di una categoria predefinita alla creazione di nuovi eventi o attività: l'utente può ora scegliere se assegnare una o più categorie oppure lasciare l'elemento senza categoria.
- Aggiunto il filtro rapido **"Senza categoria"** sia nel Calendario che nelle Cose da Fare.

---

## [v1.2.1] — 11 Novembre 2026
### 🛠️ Sessione Google Persistente (Silent Token Refresh)
- Risolto il problema della disconnessione dopo 1 ora (scadenza standard dei token OAuth 2.0 di Google) tramite rinnovo silenzioso automatico (`prompt: ''`) 5 minuti prima della scadenza, al ritorno sulla scheda (`focus` / `visibilitychange`) e tramite retry automatico su errori HTTP `401`.

---

## [v1.2.0] — 11 Novembre 2026
### 🚀 Gestione Completa Categorie, Multi-Categoria e Cancellazione Fisica Allegati
- **Nuove categorie di default:** `Prog,Vita`, `Segreteria`, `Chiesa`, `Missione`, `Giovani`.
- **Gestore Categorie completo:** possibilità di creare, rinominare, cambiare colore ed eliminare qualsiasi categoria (anche predefinita) senza mai cancellare i task o gli eventi associati.
- **Multi-categoria:** possibilità di assegnare più categorie contemporaneamente a ogni evento o attività.
- **Eliminazione fisica allegati:** rimuovendo un allegato o eliminando un task/evento collegato, il file viene cancellato fisicamente anche da Google Drive.

---

## [v1.1.1] — 10 Novembre 2026
### ✨ Categorie Personalizzabili, Drag & Drop e Tombstones
- Aggiunto selettore colori per le categorie, caricamento allegati tramite Drag & Drop e sistema di *tombstones* per impedire la ricomparsa dei task eliminati durante la sincronizzazione.

---

## [v1.1.0] — 10 Novembre 2026
### 🚀 Sincronizzazione Multi-PC Task su Google Drive
- Archiviazione cloud delle Cose da Fare nella sottocartella `Archivio_Task` su Google Drive (`_tasks_index.json` e file singoli).
- Filtro rigoroso per mostrare nella sezione Allegati esclusivamente i file reali caricati dall'utente.

---

## [v1.0.0] — 10 Novembre 2026
### 🎉 Primo Rilascio MemoTralci PWA
- Applicazione Progressive Web App (PWA) installabile su PC, smartphone e tablet con database locale Offline-First (`IndexedDB`) e tema Chiaro/Scuro.
- Sincronizzazione bidirezionale con Google Calendar (*Segreteria*) e Google Drive (*Allegati memotralci*).
- Registrazione note vocali dal microfono, ricerca globale rapida (`Ctrl+K`) ed esportazione calendario `.ics` / backup `.json`.
