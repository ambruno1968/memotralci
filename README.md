# MemoTralci - PWA Agenda, Cose da Fare & Allegati Google

**MemoTralci** è un'applicazione PWA (Progressive Web App) moderna, responsive e installabile su PC, smartphone e tablet, progettata per la gestione dell'agenda/calendario, delle liste di cose da fare (to-do) e dei documenti/allegati (PDF, foto, ricevute, fogli di calcolo, note vocali, archivi).

L'applicazione è collegata a un **account Google centralizzato** per sincronizzare in tempo reale gli eventi su **Google Calendar** e salvare tutti gli allegati in una cartella dedicata su **Google Drive**.

---

## 🌟 Caratteristiche Principali

- 📅 **Agenda & Calendario Multifunzione**:
  - Visualizzazioni interattive: **Mese**, **Settimana**, **Agenda / Elenco cronologico**.
  - Creazione eventi con titolo, date/orari, orario flessibile o "Tutto il giorno", luogo/link riunione e categorie colorate (Lavoro, Personale, Riunione, Urgente, Spesa, Altro).
  - Collegamento diretto degli allegati all'evento.
  - Sincronizzazione automatica con l'ID di **Google Calendar**.

- ✅ **Cose da Fare (To-Do & Checklist)**:
  - Creazione rapida di task e task dettagliate con priorità (*Urgente, Alta, Media, Bassa*).
  - Data di scadenza con avviso visivo se in scadenza o scaduta.
  - Sotto-attività (Checklist di controllo interna).
  - Supporto allegati anche sulle singole task.
  - **Sincronizzazione 1-Click con l'Agenda**: converte qualsiasi task con scadenza in un evento nel calendario!
  - Animazione di celebrazione (confetti) al completamento delle attività.

- 📎 **Gestione Allegati & Documenti (Google Drive)**:
  - Caricamento di qualsiasi formato: PDF, immagini, Word, Excel, note audio, archivi ZIP.
  - Drag & Drop e upload multiplo sia dagli eventi/task sia dalla schermata dedicata "Allegati".
  - Salvataggio automatico nella cartella centralizzata di **Google Drive**.
  - **Visualizzatore integrato**: anteprima immediata a schermo intero per immagini e PDF, con link per aprire su Google Drive o scaricare in locale.

- 📱 **PWA (Progressive Web App) & Offline-First**:
  - Installabile con 1 clic su Windows/Mac (Chrome/Edge) e smartphone/tablet (Android/iOS).
  - Service Worker e cache Workbox: funziona anche senza connessione internet.
  - Database locale **IndexedDB** per garantire che l'app sia sempre reattiva e utilizzabile anche offline.

- ⚙️ **Connessione Account Google Centralizzato**:
  - Utilizza un **Google Service Account** (Google Cloud IAM): non richiede a ogni singolo utente di fare login, consentendo a più persone o dispositivi di condividere lo stesso calendario e lo stesso drive aziendale/di reparto in modo sicuro e trasparente.
  - Modalità Locale automatica: l'app funziona subito al 100% anche prima di aver inserito le credenziali Google.

---

## 🚀 Avvio Rapido

### 1. Requisiti
- **Node.js** (versione 18 o superiore raccomandata)
- `npm`

### 2. Avviare l'applicazione in sviluppo

Dalla cartella principale del progetto:

```bash
# Avvia contemporaneamente il client Vite PWA (porta 5173) e l'API Server Express (porta 3001)
npm run dev
```

Apri il browser su:
👉 **http://localhost:5173**

---

## 🔑 Come Collegare l'Account Google Specifico

L'applicazione include un'interfaccia guidata accessibile cliccando sul badge **"Google" / "Modalità Locale"** nella barra in alto.

### Procedura passo-passo (Google Cloud Console):

1. **Crea un Progetto Google Cloud**:
   - Accedi a [console.cloud.google.com](https://console.cloud.google.com).
   - Crea un nuovo progetto (es. `MemoTralci`).

2. **Abilita le API necessarie**:
   - Vai in **API e servizi > Libreria**.
   - Cerca e abilita:
     - **Google Calendar API**
     - **Google Drive API**

3. **Crea un Service Account**:
   - Vai in **IAM e amministrazione > Account di servizio**.
   - Clicca **Crea account di servizio**, assegna un nome (es. `memotralci-bot`) e completa la procedura.
   - Copia l'indirizzo email generato (es: `memotralci-bot@tuo-progetto.iam.gserviceaccount.com`).
   - Clicca sull'account di servizio creato, vai nella scheda **Chiavi**, seleziona **Aggiungi chiave > Crea nuova chiave (JSON)** e scarica il file.

4. **Condividi il Calendario con il Service Account**:
   - Accedi a [calendar.google.com](https://calendar.google.com) con l'account Google da collegare.
   - Nelle impostazioni del calendario desiderato, vai alla sezione **"Condividi con persone o gruppi specifici"**.
   - Clicca **Aggiungi persone**, incolla l'email del Service Account e seleziona il permesso:
     👉 **"Apportare modifiche agli eventi"**.
   - Nella stessa pagina delle impostazioni, copia l'**ID Calendario** (es. `tuaemail@gmail.com` oppure `c_xxxxxxxx@group.calendar.google.com`).

5. **Condividi la Cartella Google Drive per gli Allegati**:
   - Accedi a [drive.google.com](https://drive.google.com) con l'account Google da collegare.
   - Crea una cartella per gli allegati (es. `MemoTralci Allegati`).
   - Fai clic destro sulla cartella > **Condividi**, incolla l'email del Service Account e assegna il ruolo di **Editor**.
   - Apri la cartella e copia l'ID dall'URL del browser (es: in `https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoP` l'ID è `1aBcDeFgHiJkLmNoP`).

6. **Inserisci i parametri in MemoTralci**:
   - Puoi incollare l'ID Calendario, l'ID Cartella e il contenuto JSON della chiave direttamente nel modal **Impostazioni** dell'app, oppure salvarli nel file `.env`:
     ```env
     PORT=3001
     GOOGLE_CALENDAR_ID=il-tuo-calendario-id@group.calendar.google.com
     GOOGLE_DRIVE_FOLDER_ID=1aBcDeFgHiJkLmNoP
     GOOGLE_SERVICE_ACCOUNT_PATH=service-account.json
     ```
   - Rinomina il file della chiave scaricato in `service-account.json` e salvalo nella cartella radice di `MemoTralci`.

---

## 📦 Struttura del Progetto

```
MemoTralci/
├── server/                    # Backend API Express per Google APIs
│   ├── config.ts              # Gestione configurazione & variabili d'ambiente
│   ├── googleClient.ts        # Autenticazione JWT con Service Account Google
│   ├── calendarService.ts     # Sincronizzazione Google Calendar
│   ├── driveService.ts        # Upload, download & gestione file su Google Drive
│   ├── taskService.ts         # Sincronizzazione to-do centralizzata
│   └── index.ts               # Endpoint API REST (/api/events, /api/tasks, /api/upload...)
├── src/                       # Frontend React 19 + TypeScript + Vite + Tailwind
│   ├── components/
│   │   ├── Navbar.tsx         # Barra navigazione responsive con badge stato Google e switch viste
│   │   ├── CalendarView.tsx   # Calendario: Mese, Settimana, Agenda
│   │   ├── TaskListView.tsx   # Lista To-Do: filtri, priorità, scadenze, confetti
│   │   ├── AttachmentsView.tsx# Gestore allegati & documenti con upload drag&drop
│   │   ├── EventModal.tsx     # Creazione/Modifica evento con allegati multipli
│   │   ├── TaskModal.tsx      # Creazione/Modifica task con checklist e allegati
│   │   ├── AttachmentModal.tsx# Visualizzatore/anteprima a schermo intero (PDF, Immagini)
│   │   ├── GoogleSettingsModal.tsx # Configurazione Google, guida integrata & backup
│   │   └── PwaInstallBanner.tsx    # Banner installazione PWA per desktop/mobile
│   ├── services/
│   │   ├── api.ts             # Client API con fallback automatico offline
│   │   └── db.ts              # Persistenza offline IndexedDB per eventi, task e file
│   ├── types/                 # Definizioni TypeScript (event, task, attachment)
│   ├── utils/                 # Utility formattazione date e gestione file
│   ├── App.tsx                # Controller principale dell'applicazione
│   └── main.tsx               # Entrypoint React
├── public/                    # Icone PWA (192x192, 512x512, SVG, Apple Touch Icon)
├── dist/                      # Build statica di produzione pronta
├── .env.example               # Template configurazione ambiente
└── vite.config.ts             # Configurazione Vite, Tailwind v4 e PWA Workbox
```

---

## 🛠️ Comandi Utili

| Comando | Descrizione |
|---|---|
| `npm run dev` | Avvia sia il frontend sia il backend in modalità sviluppo |
| `npm run client:dev` | Avvia solo il frontend Vite (porta 5173) |
| `npm run server:dev` | Avvia solo l'API server con ricarica automatica (porta 3001) |
| `npm run build` | Compila il client di produzione e genera i file PWA |
| `npm start` | Avvia il server Node di produzione |
