import React, { useState } from 'react'
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Calendar,
  HelpCircle,
  Download,
  RefreshCw,
  Check,
} from 'lucide-react'
import { api, type GoogleStatus } from '../services/api.ts'
import { localDB } from '../services/db.ts'

interface GoogleSettingsModalProps {
  status: GoogleStatus
  onClose: () => void
  onRefreshStatus: () => void
}

export const GoogleSettingsModal: React.FC<GoogleSettingsModalProps> = ({
  status,
  onClose,
  onRefreshStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'guide' | 'backup'>('config')
  const [calendarId, setCalendarId] = useState(status.calendarId || '')
  const [driveFolderId, setDriveFolderId] = useState(status.driveFolderId || '')
  const [serviceAccountJson, setServiceAccountJson] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  )

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setSaveMessage(null)

    const payload: any = {
      calendarId: calendarId.trim(),
      driveFolderId: driveFolderId.trim(),
    }
    if (serviceAccountJson.trim()) {
      payload.serviceAccountJson = serviceAccountJson.trim()
    }

    const res = await api.saveConfig(payload)
    setIsSaving(false)

    if (res.success) {
      setSaveMessage({
        type: 'success',
        text: 'Configurazione salvata con successo! Verifica della connessione in corso...',
      })
      onRefreshStatus()
    } else {
      setSaveMessage({
        type: 'error',
        text: res.error || 'Errore durante il salvataggio della configurazione',
      })
    }
  }

  async function handleExportBackup() {
    const events = await localDB.getAllEvents()
    const tasks = await localDB.getAllTasks()
    const attachments = await localDB.getAllAttachments()

    const backupData = {
      app: 'MemoTralci',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      events,
      tasks,
      attachments,
    }

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `memotralci_backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-md ring-1 ring-teal-500/20 flex-shrink-0 bg-white">
              <img src="/icon-192.png" alt="MemoTralci" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Collegamento Account Google Centralizzato
              </h2>
              <p className="text-xs text-slate-500">
                Sincronizzazione Google Calendar & Google Drive per allegati
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Pill Strip */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                status.isGoogleConfigured ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {status.isGoogleConfigured
                ? '🟢 Collegato all\'account Google'
                : '🟡 Modalità Locale / Non ancora collegato a Google'}
            </span>
          </div>
          <button
            onClick={onRefreshStatus}
            className="flex items-center space-x-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Ricarica stato</span>
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'config'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Configurazione Parametri
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'guide'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Guida Passo-Passo</span>
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'backup'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Backup Dati
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: CONFIGURATION */}
          {activeTab === 'config' && (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              {saveMessage && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center space-x-2 ${
                    saveMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                  }`}
                >
                  {saveMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{saveMessage.text}</span>
                </div>
              )}

              {/* Calendar ID */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  ID del Calendario Google
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={calendarId}
                    onChange={(e) => setCalendarId(e.target.value)}
                    placeholder="es: azienda@gmail.com oppure c_xxxxxxxx@group.calendar.google.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Può essere l'indirizzo Gmail principale o l'ID del calendario condiviso.
                </p>
              </div>

              {/* Drive Folder ID */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  ID Cartella Google Drive per gli Allegati
                </label>
                <div className="relative">
                  <FolderOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={driveFolderId}
                    onChange={(e) => setDriveFolderId(e.target.value)}
                    placeholder="es: 1ABCdEFG_hijKLMnopQRstUVwXYz (dall'URL di Drive)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Crea una cartella su Google Drive (es. "MemoTralci Allegati") e incolla qui l'ID presente nell'URL del browser.
                </p>
              </div>

              {/* Service Account Key JSON */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Chiave Service Account Google (JSON)
                </label>
                <textarea
                  rows={4}
                  value={serviceAccountJson}
                  onChange={(e) => setServiceAccountJson(e.target.value)}
                  placeholder="Incolla qui l'intero contenuto del file service-account.json scaricato dalla Google Cloud Console (oppure posiziona il file service-account.json nella cartella radice del progetto)..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  La chiave viene conservata in sicurezza sul server locale e non viene mai esposta all'esterno.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Salva Configurazione Google</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: STEP-BY-STEP GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
                <h4 className="font-bold text-indigo-900 dark:text-indigo-200 text-sm mb-1 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Come funziona l'accesso centralizzato senza login?</span>
                </h4>
                <p className="text-indigo-800/80 dark:text-indigo-300/80 text-xs">
                  Grazie a un <strong>Service Account di Google Cloud</strong>, l'app può leggere e scrivere direttamente sul calendario e sulla cartella Drive centralizzata dell'account target, senza chiedere a ogni utente di fare login individuale.
                </p>
              </div>

              {/* Step 1 */}
              <div className="space-y-1.5 border-l-2 border-indigo-500 pl-3">
                <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                  1. Crea un progetto su Google Cloud Console
                </h5>
                <p>
                  Accedi a <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold underline">console.cloud.google.com</a>, crea un nuovo progetto (es. "MemoTralci") e abilita le seguenti due API nella sezione <strong>API e Servizi &gt; Libreria</strong>:
                </p>
                <ul className="list-disc list-inside font-semibold space-y-0.5 text-slate-800 dark:text-slate-200">
                  <li>Google Calendar API</li>
                  <li>Google Drive API</li>
                </ul>
              </div>

              {/* Step 2 */}
              <div className="space-y-1.5 border-l-2 border-indigo-500 pl-3">
                <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                  2. Crea il Service Account e scarica la chiave JSON
                </h5>
                <p>
                  Vai in <strong>IAM e amministrazione &gt; Account di servizio</strong> e clicca su <strong>Crea account di servizio</strong>.
                  Una volta creato, clicca sull'account, vai nella scheda <strong>Chiavi</strong>, clicca su <strong>Aggiungi chiave &gt; Crea nuova chiave (JSON)</strong>. Salva il file scaricato.
                </p>
              </div>

              {/* Step 3 */}
              <div className="space-y-1.5 border-l-2 border-indigo-500 pl-3">
                <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                  3. Condividi il Calendario con l'email del Service Account
                </h5>
                <p>
                  Apri <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold underline">Google Calendar</a> con l'account Google target.
                  Nelle impostazioni del calendario desiderato, sotto <strong>"Condividi con persone specifiche"</strong>, incolla l'indirizzo email del Service Account (es. <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">nome@progetto.iam.gserviceaccount.com</code>) e assegna il permesso <strong>"Apportare modifiche agli eventi"</strong>.
                </p>
              </div>

              {/* Step 4 */}
              <div className="space-y-1.5 border-l-2 border-indigo-500 pl-3">
                <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                  4. Condividi la cartella Google Drive per gli allegati
                </h5>
                <p>
                  Apri <a href="https://drive.google.com" target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold underline">Google Drive</a> con l'account Google target.
                  Crea una cartella (es. "MemoTralci Allegati"), fai clic destro &gt; <strong>Condividi</strong>, incolla la stessa email del Service Account e assegna il ruolo di <strong>Editor</strong>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Puoi esportare in qualsiasi momento tutti gli eventi, le attività e i metadati degli allegati salvati in locale in un unico file JSON di backup.
              </p>

              <button
                type="button"
                onClick={handleExportBackup}
                className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Scarica Backup Dati (JSON)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
