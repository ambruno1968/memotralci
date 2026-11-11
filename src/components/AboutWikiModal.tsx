import React, { useState } from 'react'
import {
  X,
  BookOpen,
  Info,
  Calendar,
  CheckSquare,
  Tag,
  Paperclip,
  Cloud,
  Smartphone,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import appLogo from '../assets/logo-icon.png'
import { APP_VERSION, APP_CREDITS } from '../config/version.ts'

interface AboutWikiModalProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'wiki' | 'credits'

export const AboutWikiModal: React.FC<AboutWikiModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('wiki')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header con chiusura rapida */}
        <div className="relative pt-6 pb-4 px-6 border-b border-slate-100 dark:border-slate-800 text-center bg-gradient-to-b from-teal-50/50 to-transparent dark:from-teal-950/20">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Logo ingrandito */}
          <div className="relative inline-block my-2">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden shadow-2xl shadow-teal-900/30 ring-4 ring-teal-500/25 bg-white dark:bg-slate-800 mx-auto transition-transform hover:scale-105 duration-300">
              <img
                src={appLogo}
                alt="Come Tralci Novara Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-1.5 rounded-xl shadow-md">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-2">
            MemoTralci
          </h2>
          <p className="text-xs sm:text-sm font-bold text-teal-700 dark:text-teal-400">
            {APP_CREDITS.organization}
          </p>

          <div className="inline-flex items-center space-x-1.5 mt-2 px-3 py-1 rounded-full bg-teal-100/80 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200 text-xs font-black border border-teal-200/80 dark:border-teal-800">
            <span>Versione {APP_VERSION}</span>
            <span>•</span>
            <span className="text-[11px] font-medium">{APP_CREDITS.releaseDate}</span>
          </div>

          {/* Tab switch */}
          <div className="flex items-center justify-center space-x-2 mt-5">
            <button
              onClick={() => setActiveTab('wiki')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-2xl text-xs font-black transition cursor-pointer ${
                activeTab === 'wiki'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Piccola Wiki (Guida)</span>
            </button>

            <button
              onClick={() => setActiveTab('credits')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-2xl text-xs font-black transition cursor-pointer ${
                activeTab === 'credits'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>Crediti & Note</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Piccola Wiki */}
        {activeTab === 'wiki' && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
            {/* 1. Calendario */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 space-y-2">
              <div className="flex items-center space-x-2 font-black text-indigo-900 dark:text-indigo-200 text-sm sm:text-base">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>1. Calendario & Agenda Google</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-xs sm:text-[13px] leading-relaxed">
                <li>
                  <strong>Passi di 5 minuti:</strong> quando selezioni l'orario, l'elenco dei minuti avanza a scatti di 5 (00, 05, 10, 15, ecc.).
                </li>
                <li>
                  <strong>Orario di fine coerente:</strong> l'orario di fine è vincolato ed è sempre uguale o successivo all'orario di inizio.
                </li>
                <li>
                  <strong>Sincronizzazione Google Calendar:</strong> gli eventi si salvano nel calendario <em>Segreteria</em> e rimangono sincronizzati su tutti i dispositivi.
                </li>
              </ul>
            </div>

            {/* 2. Cose da Fare */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 space-y-2">
              <div className="flex items-center space-x-2 font-black text-emerald-900 dark:text-emerald-200 text-sm sm:text-base">
                <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>2. Cose da Fare (Attività & To-Do)</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-xs sm:text-[13px] leading-relaxed">
                <li>
                  <strong>Archivio dedicato su Drive:</strong> le attività vengono salvate nella cartella <code>allegati/Archivio_Task</code> sia come archivio singoli file JSON (per data e descrizione) sia con indice generale.
                </li>
                <li>
                  <strong>Priorità e Scadenze:</strong> organizza le attività per Bassa, Media, Alta o Urgente, con checklist per suddividere compiti complessi.
                </li>
              </ul>
            </div>

            {/* 3. Categorie */}
            <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-900/50 space-y-2">
              <div className="flex items-center space-x-2 font-black text-purple-900 dark:text-purple-200 text-sm sm:text-base">
                <Tag className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>3. Categorie Facoltative & Gestione Completa</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-xs sm:text-[13px] leading-relaxed">
                <li>
                  <strong>Facoltative:</strong> non c'è più una categoria obbligatoria o preselezionata per forza.
                </li>
                <li>
                  <strong>Multi-assegnazione:</strong> puoi assegnare più categorie contemporaneamente a un evento o a un task toccandole per far comparire la spunta.
                </li>
                <li>
                  <strong>Gestisci (Rinomina ed Elimina):</strong> tramite il pulsante <em>⚙️ Gestisci</em> puoi cambiare nome o colore a una categoria, oppure eliminarla in sicurezza: i task collegati rimarranno intatti senza perdere alcun dato.
                </li>
              </ul>
            </div>

            {/* 4. Allegati & Note Vocali */}
            <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-900/50 space-y-2">
              <div className="flex items-center space-x-2 font-black text-teal-900 dark:text-teal-200 text-sm sm:text-base">
                <Paperclip className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>4. Allegati, Note Vocali & Cancellazione Fisica</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-xs sm:text-[13px] leading-relaxed">
                <li>
                  <strong>Drag & Drop e Note Vocali:</strong> puoi trascinare file (PDF, immagini, documenti) o registrare memo vocali direttamente dal microfono.
                </li>
                <li>
                  <strong>Cancellazione fisica su Drive:</strong> quando elimini un allegato (o l'attività che lo contiene), il file viene eliminato fisicamente anche da Google Drive, evitando accumuli di file orfani.
                </li>
              </ul>
            </div>

            {/* 5. Connessione & Rinnovo Silenzioso */}
            <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-900/50 space-y-2">
              <div className="flex items-center space-x-2 font-black text-sky-900 dark:text-sky-200 text-sm sm:text-base">
                <Cloud className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>5. Connessione Google Sempre Attiva</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-[13px] leading-relaxed">
                Grazie al <strong>Rinnovo Automatico Silenzioso (Silent Refresh)</strong>, MemoTralci rinnova il token di sicurezza in background prima che scada l'ora di validità di Google, evitando disconnessioni continue.
              </p>
            </div>

            {/* 6. Installazione PWA */}
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center space-x-2 font-black text-slate-900 dark:text-slate-200 text-sm sm:text-base">
                <Smartphone className="w-5 h-5 text-slate-600 dark:text-slate-400 shrink-0" />
                <span>6. Installazione su Smartphone, Tablet e PC</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-[13px] leading-relaxed">
                MemoTralci è una PWA (Progressive Web App): puoi installarla come un'app nativa cliccando sul pulsante <strong>Installa</strong> nella barra in alto, oppure dal menu del browser (<em>"Aggiungi a schermata Home"</em> su smartphone/tablet o <em>"Installa app"</em> su Chrome/Edge).
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Crediti & Informazioni */}
        {activeTab === 'credits' && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 space-y-3">
              <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <span>Informazioni Software & Crediti</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2 p-2.5 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/70 dark:border-teal-800">
                  <span className="text-teal-700 dark:text-teal-300 block font-bold uppercase text-[10px]">Sviluppato da</span>
                  <span className="font-black text-slate-900 dark:text-white text-sm">{APP_CREDITS.developedBy}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">Applicazione</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{APP_CREDITS.appName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">Versione SemVer</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">v{APP_CREDITS.version}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">Sviluppata per</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{APP_CREDITS.developedFor}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">Organizzazione</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{APP_CREDITS.organization}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {APP_CREDITS.description}
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                <Mail className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Contatto: </span>
                <a
                  href={`mailto:${APP_CREDITS.contactEmail}`}
                  className="text-teal-600 dark:text-teal-400 hover:underline font-bold"
                >
                  {APP_CREDITS.contactEmail}
                </a>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-slate-800/40 border border-teal-200/50 dark:border-slate-700 space-y-2">
              <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Specifiche Tecniche
              </h4>
              <ul className="list-disc list-inside space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                <li>Architettura PWA Offline-First con Service Worker</li>
                <li>Google Identity Services OAuth 2.0 (Silent Token Refresh)</li>
                <li>Google Calendar API v3 & Google Drive API v3</li>
                <li>Database locale IndexedDB sincronizzato</li>
              </ul>
            </div>

            <p className="text-center text-[11px] text-slate-400 pt-2 font-medium">
              {APP_CREDITS.copyright}
            </p>
          </div>
        )}

        {/* Footer con pulsante Chiudi */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">
            MemoTralci • {APP_CREDITS.organization}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black transition shadow-sm"
          >
            Ho capito, Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
