import React, { useState, useEffect } from 'react'
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
  LogIn,
  LogOut,
  ExternalLink,
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
  const [calendarId, setCalendarId] = useState(
    status.calendarId || 'segreteria.cometralcinovara@gmail.com'
  )
  const [driveFolderId, setDriveFolderId] = useState(
    status.driveFolderId || 'allegati memotralci'
  )
  const [serviceAccountJson, setServiceAccountJson] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  )
  const [availableCalendars, setAvailableCalendars] = useState<
    { id: string; summary: string; primary: boolean }[]
  >([])
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false)

  useEffect(() => {
    if (status.isGoogleConfigured) {
      loadCalendarsList()
    }
  }, [status.isGoogleConfigured])

  async function loadCalendarsList() {
    setIsLoadingCalendars(true)
    try {
      const res = await api.getCalendars()
      setAvailableCalendars(res.calendars || [])
    } catch {
      // Ignora
    } finally {
      setIsLoadingCalendars(false)
    }
  }

  async function handleOAuthLogin() {
    const url = await api.getOAuthUrl()
    if (url) {
      window.location.href = url
    } else {
      alert(
        'Impossibile avviare il login Google. Verifica che il file di credenziali sia presente nella cartella del progetto.'
      )
    }
  }

  async function handleOAuthDisconnect() {
    if (confirm('Vuoi davvero disconnettere l\'account Google?')) {
      await api.disconnectGoogle()
      onRefreshStatus()
    }
  }

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
        text: 'Configurazione salvata con successo! Verifica della sincronizzazione in corso...',
      })
      onRefreshStatus()
      setServiceAccountJson('')
    } else {
      setSaveMessage({
        type: 'error',
        text: res.error || 'Errore durante il salvataggio.',
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

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `memotralci_backup_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const isOAuth = status.credentialType === 'oauth_client'

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
                Sincronizzazione Google Calendar & Drive
              </h2>
              <p className="text-xs text-slate-500">
                Collegamento bidirezionale con l'account Google Segreteria
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
                ? `🟢 Connesso: ${status.resolvedCalendar || status.calendarId || 'Segreteria'}`
                : isOAuth
                ? '🟡 Credenziali OAuth rilevate: accedi per collegare Segreteria'
                : '🟡 Modalità Locale / Credenziali Google non ancora attive'}
            </span>
          </div>
          <button
            onClick={onRefreshStatus}
            className="flex items-center space-x-1 text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline"
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
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Configurazione & Accesso
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'guide'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Guida Service Account</span>
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'backup'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
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
            <div className="space-y-5">
              {/* OAuth Client Detected Alert */}
              {isOAuth && (
                <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 space-y-3">
                  <div className="flex items-start space-x-3">
                    <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-teal-900 dark:text-teal-200">
                        Credenziali Google Cloud rilevate (memotralci-514312)
                      </h4>
                      <p className="text-xs text-teal-800/80 dark:text-teal-300/80 mt-0.5">
                        Il file caricato è un <strong>ID Client OAuth 2.0</strong>. Per attivare la sincronizzazione bidirezionale con l'account <strong>segreteria.cometralcinovara@gmail.com</strong>:
                      </p>
                    </div>
                  </div>

                  {status.oauthConnected ? (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Autenticazione OAuth attiva con Google</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleOAuthDisconnect}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-200 transition"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Disconnetti</span>
                      </button>
                    </div>
                  ) : (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleOAuthLogin}
                        className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Accedi con Google per connettere il Calendario Segreteria</span>
                      </button>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 text-center">
                        Oppure crea una chiave Service Account (scheda Guida) per la sincronizzazione 24/7 senza dover fare login.
                      </p>
                    </div>
                  )}
                </div>
              )}

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

              <form onSubmit={handleSaveConfig} className="space-y-4">
                {/* Calendar ID or Name */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Nome o ID Calendario Google (es: Segreteria)
                    </label>
                    {status.isGoogleConfigured && (
                      <button
                        type="button"
                        onClick={loadCalendarsList}
                        disabled={isLoadingCalendars}
                        className="text-[11px] text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center space-x-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingCalendars ? 'animate-spin' : ''}`} />
                        <span>Rileva Calendari</span>
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={calendarId}
                      onChange={(e) => setCalendarId(e.target.value)}
                      placeholder="es: Segreteria oppure segreteria.cometralcinovara@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Il sistema rileva automaticamente il calendario <strong>"Segreteria"</strong> se condiviso o presente nel tuo account.
                  </p>

                  {/* Accessible calendars list if found */}
                  {availableCalendars.length > 0 && (
                    <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                        Calendari trovati su Google:
                      </p>
                      {availableCalendars.map((cal) => (
                        <div
                          key={cal.id}
                          onClick={() => setCalendarId(cal.id)}
                          className="flex items-center justify-between p-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-slate-700 transition cursor-pointer text-xs"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {cal.summary} {cal.primary ? '(Principale)' : ''}
                          </span>
                          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
                            Seleziona
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Drive Folder ID */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Nome o ID Cartella Google Drive per gli Allegati
                  </label>
                  <div className="relative">
                    <FolderOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={driveFolderId}
                      onChange={(e) => setDriveFolderId(e.target.value)}
                      placeholder="es: allegati memotralci oppure ID della cartella Drive"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Se inserisci <strong>allegati memotralci</strong>, la cartella verrà cercata o creata automaticamente su Google Drive.
                  </p>
                </div>

                {/* Service Account Key JSON */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Aggiorna Chiave Service Account Google (JSON)
                  </label>
                  <textarea
                    rows={3}
                    value={serviceAccountJson}
                    onChange={(e) => setServiceAccountJson(e.target.value)}
                    placeholder="Se desideri la sincronizzazione automatica senza login, incolla qui il JSON della Service Account creata su Google Cloud Console..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Salva Parametri Sincronizzazione</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: STEP-BY-STEP GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/60">
                <h4 className="font-bold text-teal-900 dark:text-teal-200 text-sm mb-1 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>Sincronizzazione Automatica con Service Account</span>
                </h4>
                <p className="text-teal-800/80 dark:text-teal-300/80 text-xs">
                  Con un <strong>Account di Servizio</strong>, MemoTralci si connette a Google Calendar e Google Drive 24/7 in background senza richiedere login da ogni dispositivo.
                </p>
              </div>

              {/* Step 1 */}
              <div className="space-y-1.5 border-l-2 border-teal-500 pl-3">
                <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                  1. Nel tuo progetto Google Cloud (memotralci-514312)
                </h5>
                <p>
                  Accedi a <a href="https://console.cloud.google.com/iam-admin/serviceaccounts?project=memotralci-514312" target="_blank" rel="noreferrer" className="text-teal-600 font-semibold underline inline-flex items-center">Account di Servizio <ExternalLink className="w-3 h-3 ml-1" /></a>.
                </p>
                <p>
                  Clicca su <strong>"+ Crea account di servizio"</strong> (es. nome <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">memotralci-sync</code>).
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-1.5 border-l-2 border-teal-500 pl-3">
                <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                  2. Genera e scarica la chiave JSON
                </h5>
                <p>
                  Clicca sull'account appena creato &gt; scheda <strong>Chiavi</strong> &gt; <strong>Aggiungi chiave &gt; Crea nuova chiave (JSON)</strong>.
                </p>
                <p>
                  Salva il file come <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">service-account.json</code> nella cartella radice del repository oppure incollane il contenuto nella scheda Parametri.
                </p>
              </div>

              {/* Step 3 */}
              <div className="space-y-1.5 border-l-2 border-teal-500 pl-3">
                <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                  3. Condividi il Calendario "Segreteria" con l'email del Service Account
                </h5>
                <p>
                  Apri <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="text-teal-600 font-semibold underline inline-flex items-center">Google Calendar <ExternalLink className="w-3 h-3 ml-1" /></a> con l'account <strong>segreteria.cometralcinovara@gmail.com</strong>.
                </p>
                <p>
                  Nelle impostazioni del calendario <strong>Segreteria</strong>, sotto <strong>"Condividi con persone specifiche"</strong>, aggiungi l'email del Service Account e assegna il permesso <strong>"Apportare modifiche agli eventi"</strong>.
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
