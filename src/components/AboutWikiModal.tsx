import React, { useState, useEffect } from 'react'
import {
  X,
  BookOpen,
  Info,
  History,
  Calendar,
  CheckSquare,
  Tag,
  Paperclip,
  Smartphone,
  Mail,
  ShieldCheck,
  Sparkles,
  QrCode,
  Copy,
  Check,
  Download,
  ExternalLink,
  Share2,
} from 'lucide-react'
import appLogo from '../assets/logo-icon.png'
import { APP_VERSION, APP_CREDITS, APP_STORYLOG } from '../config/version.ts'

export type AboutTabType = 'wiki' | 'qrcode' | 'storylog' | 'credits'

interface AboutWikiModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: AboutTabType
}

export const AboutWikiModal: React.FC<AboutWikiModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'wiki',
}) => {
  const [activeTab, setActiveTab] = useState<AboutTabType>(initialTab)
  const [copied, setCopied] = useState(false)
  const [qrStyle, setQrStyle] = useState<'brand' | 'classic'>('brand')

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])

  if (!isOpen) return null

  const pwaUrl = 'https://ambruno1968.github.io/memotralci/'
  const baseUrl = import.meta.env.BASE_URL || './'
  const qrBrandImg = `${baseUrl}qrcode-brand.png`
  const qrClassicImg = `${baseUrl}qrcode.png`
  const qrFlyerImg = `${baseUrl}qrcode-flyer.png`

  const currentQrImg = qrStyle === 'brand' ? qrBrandImg : qrClassicImg

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(pwaUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MemoTralci - PWA Agenda & Note',
          text: 'Accedi e installa la PWA MemoTralci (Come Tralci):',
          url: pwaUrl,
        })
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyUrl()
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 safe-top safe-bottom">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col max-h-[88dvh] sm:max-h-[92vh] overflow-hidden">
        {/* Header con chiusura rapida */}
        <div className="relative pt-6 pb-4 px-6 border-b border-slate-100 dark:border-slate-800 text-center bg-gradient-to-b from-teal-50/50 to-transparent dark:from-teal-950/20">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
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
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-5">
            <button
              onClick={() => setActiveTab('wiki')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl text-xs font-black transition cursor-pointer ${
                activeTab === 'wiki'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Piccola Wiki</span>
            </button>

            <button
              onClick={() => setActiveTab('qrcode')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl text-xs font-black transition cursor-pointer ${
                activeTab === 'qrcode'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-teal-700 dark:text-teal-300 hover:bg-slate-200/70'
              }`}
            >
              <QrCode className="w-4 h-4 text-emerald-500" />
              <span>QR Code PWA</span>
            </button>

            <button
              onClick={() => setActiveTab('storylog')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl text-xs font-black transition cursor-pointer ${
                activeTab === 'storylog'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Storylog</span>
            </button>

            <button
              onClick={() => setActiveTab('credits')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl text-xs font-black transition cursor-pointer ${
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
                  <strong>Vista Giornaliera (&ldquo;Oggi&rdquo; / &ldquo;Giorno&rdquo;):</strong> cliccando su <em>Oggi</em>, su <em>Giorno</em> o sul numero di una data nel calendario visualizzi solo gli impegni e le attività di quel singolo giorno.
                </li>
                <li>
                  <strong>Viste Calendario:</strong> naviga rapidamente tra <em>Mese</em>, <em>Settimana</em>, <em>Giorno</em> e <em>Agenda Cronologica</em>.
                </li>
                <li>
                  <strong>Eventi Multi-giorno:</strong> indicano in modo chiaro data e ora completa di inizio e fine sia nell'agenda che nella vista giornaliera.
                </li>
                <li>
                  <strong>Sincronizzazione Automatica:</strong> sincronizzazione continua ogni 25 secondi con Google Calendar centralizzato.
                </li>
              </ul>
            </div>

            {/* 2. Cose da fare */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 space-y-2">
              <div className="flex items-center space-x-2 font-black text-emerald-900 dark:text-emerald-200 text-sm sm:text-base">
                <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>2. Cose da Fare (To-Do & Checklist)</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-xs sm:text-[13px] leading-relaxed">
                <li>
                  <strong>Priorità & Scadenze:</strong> organizza le attività con priorità colorate e avvisi visivi in caso di scadenza imminente o superata.
                </li>
                <li>
                  <strong>Conversione in Evento 1-Click:</strong> trasforma qualsiasi task con scadenza in un evento del calendario con un solo tocco.
                </li>
                <li>
                  <strong>Checklist Interna:</strong> suddividi le attività complesse in comode sotto-attività spuntabili.
                </li>
              </ul>
            </div>

            {/* 3. Note Post-it */}
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 space-y-2">
              <div className="flex items-center space-x-2 font-black text-amber-900 dark:text-amber-200 text-sm sm:text-base">
                <Tag className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>3. Sezione Note (Post-it) & Condivisione</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-xs sm:text-[13px] leading-relaxed">
                <li>
                  <strong>Bacheca Post-it Colorata:</strong> crea e organizza appunti rapidi con 6 colori pastello e fissali in alto con la puntina (Pin).
                </li>
                <li>
                  <strong>Condivisione Grafica con Logo:</strong> genera al volo una locandina PNG elegante con logo Come Tralci o condividi il testo formattato su WhatsApp e altre app.
                </li>
              </ul>
            </div>

            {/* 4. Documenti & Allegati */}
            <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-900/50 space-y-2">
              <div className="flex items-center space-x-2 font-black text-purple-900 dark:text-purple-200 text-sm sm:text-base">
                <Paperclip className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>4. Gestione Documenti & Allegati Drive</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-xs sm:text-[13px] leading-relaxed">
                <li>
                  <strong>Upload Multiplo & Formati Supportati:</strong> carica PDF, foto, ricevute, documenti Word/Excel, note audio e archivi ZIP.
                </li>
                <li>
                  <strong>Visualizzatore Integrato:</strong> anteprima immediata a tutto schermo per PDF e immagini, con link per il download o apertura diretta su Google Drive.
                </li>
              </ul>
            </div>

            {/* 5. PWA & Offline */}
            <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-900/50 space-y-2">
              <div className="flex items-center space-x-2 font-black text-teal-900 dark:text-teal-200 text-sm sm:text-base">
                <Smartphone className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>5. PWA (Installazione su Smartphone e PC)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                L'applicazione è installabile come app nativa senza passare dagli store. Apri la scheda <strong>QR Code PWA</strong> per inquadrare il codice con la fotocamera del tuo cellulare o di altri dispositivi.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: QR Code PWA (Scansione da altri cellulari) */}
        {activeTab === 'qrcode' && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
            <div className="text-center space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center justify-center space-x-2">
                <QrCode className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>Scansiona con altri cellulari</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Inquadra questo QR code con la fotocamera di qualsiasi smartphone Android o iPhone per aprire subito MemoTralci e installarla.
              </p>
            </div>

            {/* QR Box interattivo */}
            <div className="bg-gradient-to-b from-teal-50/70 via-slate-50 to-white dark:from-teal-950/30 dark:via-slate-800/60 dark:to-slate-900 p-5 rounded-3xl border border-teal-200/80 dark:border-teal-800/70 flex flex-col items-center shadow-lg space-y-4">
              {/* Selettore Stile QR */}
              <div className="inline-flex p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setQrStyle('brand')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    qrStyle === 'brand'
                      ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Con Logo MemoTralci
                </button>
                <button
                  type="button"
                  onClick={() => setQrStyle('classic')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    qrStyle === 'classic'
                      ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Classico Alto Contrasto
                </button>
              </div>

              {/* QR Image con ombra e badge */}
              <div className="relative p-3 bg-white rounded-2xl shadow-xl ring-4 ring-teal-500/20 max-w-[240px] sm:max-w-[280px]">
                <img
                  src={currentQrImg}
                  alt="QR Code PWA MemoTralci"
                  className="w-full h-auto rounded-lg select-none"
                />
              </div>

              {/* URL Pill con pulsante Copia */}
              <div className="w-full max-w-md bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-2 sm:p-2.5 flex items-center justify-between gap-2 shadow-xs">
                <div className="truncate text-[11px] sm:text-xs font-mono font-bold text-teal-700 dark:text-teal-300 pl-1">
                  {pwaUrl}
                </div>
                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={handleCopyUrl}
                    className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 text-xs font-bold transition flex items-center space-x-1 cursor-pointer border border-teal-200/70 dark:border-teal-800"
                    title="Copia indirizzo negli appunti"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[10px] sm:text-xs">Copiato!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[10px] sm:text-xs">Copia</span>
                      </>
                    )}
                  </button>

                  <a
                    href={pwaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
                    title="Apri sito in una nuova scheda"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Pulsanti di Azione e Download */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full max-w-md">
                <a
                  href={currentQrImg}
                  download={qrStyle === 'brand' ? 'qrcode-memotralci-brand.png' : 'qrcode-memotralci.png'}
                  className="flex-1 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm text-center"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>Scarica QR (PNG)</span>
                </a>

                <a
                  href={qrFlyerImg}
                  download="locandina-memotralci-flyer.png"
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm border border-slate-700 text-center"
                >
                  <Download className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Locandina Stampa</span>
                </a>

                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button
                    onClick={handleShare}
                    className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
                    title="Condividi tramite WhatsApp o altre app"
                  >
                    <Share2 className="w-4 h-4 shrink-0" />
                    <span>Condividi</span>
                  </button>
                )}
              </div>
            </div>

            {/* Mini Guida Installazione Smartphone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Su Android (Chrome / Edge)</span>
                </div>
                <ol className="list-decimal list-inside text-slate-500 dark:text-slate-400 space-y-1 text-[11px] leading-relaxed">
                  <li>Inquadra il QR con la fotocamera o Google Lens</li>
                  <li>Tocca i tre puntini <strong className="text-slate-700 dark:text-slate-200">⋮</strong> in alto a destra</li>
                  <li>Seleziona <strong className="text-slate-700 dark:text-slate-200">&ldquo;Installa app&rdquo;</strong> o <strong className="text-slate-700 dark:text-slate-200">&ldquo;Aggiungi a schermata Home&rdquo;</strong></li>
                </ol>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  <span>Su iPhone / iPad (Safari)</span>
                </div>
                <ol className="list-decimal list-inside text-slate-500 dark:text-slate-400 space-y-1 text-[11px] leading-relaxed">
                  <li>Inquadra il QR con la fotocamera e tocca il link</li>
                  <li>Tocca il pulsante <strong className="text-slate-700 dark:text-slate-200">Condividi</strong> (quadrato con freccia in su)</li>
                  <li>Scorri e tocca <strong className="text-slate-700 dark:text-slate-200">&ldquo;Aggiungi alla schermata Home&rdquo;</strong></li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Storylog */}
        {activeTab === 'storylog' && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
            {APP_STORYLOG.map((entry, idx) => (
              <div
                key={entry.version}
                className={`p-4 rounded-2xl border space-y-2 transition ${
                  idx === 0
                    ? 'bg-teal-50/70 dark:bg-teal-950/35 border-teal-300 dark:border-teal-800/80 shadow-xs'
                    : 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-700/70'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                        idx === 0
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      v{entry.version}
                    </span>
                    <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                      {entry.title}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {idx === 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase">
                        Attuale
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-slate-400">{entry.date}</span>
                  </div>
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-0.5">
                  {entry.changes.map((change, cIdx) => (
                    <li key={cIdx}>{change}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Crediti & Informazioni */}
        {activeTab === 'credits' && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
            {/* Box QR Code nei crediti */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/30 border border-teal-200 dark:border-teal-800/70 flex flex-col sm:flex-row items-center gap-4 shadow-xs">
              <div className="w-24 h-24 p-1.5 bg-white rounded-xl shadow-md ring-2 ring-teal-500/20 shrink-0">
                <img
                  src={qrBrandImg}
                  alt="QR Code PWA"
                  className="w-full h-full object-cover rounded-md"
                />
              </div>
              <div className="flex-1 text-center sm:text-left space-y-1.5">
                <div className="flex items-center justify-center sm:justify-start space-x-1.5 font-black text-slate-900 dark:text-white text-sm">
                  <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Scansiona con altri cellulari</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Inquadra il QR code per installare o usare l'app su un altro smartphone o tablet.
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <button
                    onClick={() => setActiveTab('qrcode')}
                    className="px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center space-x-1"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Apri QR Code Ingrandito</span>
                  </button>
                  <a
                    href={qrFlyerImg}
                    download="locandina-memotralci.png"
                    className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-bold transition border border-slate-300 dark:border-slate-700 flex items-center space-x-1"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-500" />
                    <span>Locandina Stampa</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Dettagli Software & Sviluppatore */}
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
                <li>QR Code integrato e supporto Web Share API</li>
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
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black transition shadow-sm cursor-pointer"
          >
            Ho capito, Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
