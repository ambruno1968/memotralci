# 📖 Storylog & Changelog — MemoTralci

**Applicazione:** MemoTralci — Agenda, Note & Allegati  
**Organizzazione:** Associazione Come Tralci - Novara (*Segreteria Come Tralci Novara*)  
**Sviluppato da:** **Bruno Astemio (bam@68)**  
**Standard di Versionamento:** [SemVer 2.0.0](https://semver.org/lang/it/)

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
