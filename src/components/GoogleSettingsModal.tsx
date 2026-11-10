import React, { useState } from 'react'
import appLogo from '../assets/logo-icon.png'
import {
  X,
  ShieldCheck,
  CheckCircle2,
  FolderOpen,
  Calendar,
  Download,
  RefreshCw,
  LogIn,
  LogOut,
  Upload,
  Info,
} from 'lucide-react'
import { api, type GoogleStatus } from '../services/api.ts'
import { googleClientSide, GOOGLE_DEFAULTS } from '../services/googleClientSide.ts'
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
  const [activeTab, setActiveTab] = useState<'access' | 'backup'>('access')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const isConnected = status.isGoogleConfigured || googleClientSide.isConnected()
  const userInfo = status.userInfo || googleClientSide.getUserInfo()
  const accountEmail = userInfo?.email || (isConnected ? GOOGLE_DEFAULTS.calendarEmail : 'Non collegato')

  async function handleGoogleLogin() {
    setIsLoggingIn(true)
    setSyncFeedback(null)
    try {
      await googleClientSide.signIn()
      setSyncFeedback({ type: 'ok', text: 'Accesso Google completato con successo! Sincronizzazione in corso...' })
      onRefreshStatus()
      setTimeout(() => {
        setSyncFeedback(null)
      }, 4000)
    } catch (err: any) {
      console.error('Login Google err:', err)
      setSyncFeedback({
        type: 'err',
        text: err?.message || 'Accesso non completato. Riprova selezionando l\'account di Segreteria.',
      })
    } finally {
      setIsLoggingIn(false)
    }
  }

  async function handleGoogleDisconnect() {
    if (confirm('Vuoi davvero scollegare l\'account Google dalla sessione?')) {
      await api.disconnectGoogle()
      setSyncFeedback({ type: 'ok', text: 'Account Google scollegato.' })
      onRefreshStatus()
      setTimeout(() => setSyncFeedback(null), 3000)
    }
  }

  async function handleSyncNow() {
    setIsSyncing(true)
    setSyncFeedback(null)
    try {
      await onRefreshStatus()
      setSyncFeedback({ type: 'ok', text: 'Calendario ed allegati sincronizzati con Google!' })
      setTimeout(() => setSyncFeedback(null), 3500)
    } catch (err: any) {
      setSyncFeedback({ type: 'err', text: 'Errore sincronizzazione: ' + (err?.message || 'Riprova') })
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleExportBackup() {
    try {
      const data = await localDB.exportAllData()
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `memotralci_backup_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      alert('Errore esportazione backup: ' + err.message)
    }
  }

  async function handleImportBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (confirm(`Ripristinare il backup del file ${file.name}? I dati attuali verranno aggiornati.`)) {
        await localDB.importAllData(data)
        alert('Dati ripristinati con successo!')
        onRefreshStatus()
      }
    } catch (err: any) {
      alert('Errore lettura file di backup: ' + err.message)
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl overflow-hidden ring-1 ring-teal-500/20 bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm shrink-0">
              <img src={appLogo} alt="MemoTralci" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Account Google & Sincronizzazione
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                MemoTralci • Agenda, Note & Allegati
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

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-2 bg-slate-50/30 dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('access')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'access'
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Accesso & Calendario</span>
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'backup'
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Backup Dati</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {syncFeedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center space-x-2 ${
                syncFeedback.type === 'ok'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {syncFeedback.type === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Info className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              <span>{syncFeedback.text}</span>
            </div>
          )}

          {activeTab === 'access' && (
            <div className="space-y-5">
              {/* Stato Connessione Account */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  isConnected
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3.5">
                    {userInfo?.picture ? (
                      <img
                        src={userInfo.picture}
                        alt="Profilo"
                        className="w-12 h-12 rounded-full ring-2 ring-emerald-500/30 object-cover shadow-sm"
                      />
                    ) : (
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                          isConnected
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                            : 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                        }`}
                      >
                        {isConnected ? '✓' : 'G'}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {userInfo?.name || (isConnected ? 'Segreteria Come Tralci' : 'Accesso Google Richiesto')}
                        </h4>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isConnected
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                          }`}
                        >
                          {isConnected ? 'Collegato' : 'In attesa'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                        {accountEmail}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dettagli configurazione preimpostata */}
                <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-800/70 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                    <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Calendario</div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {GOOGLE_DEFAULTS.calendarName}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-800/70 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Archivio Task</div>
                      <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[120px]" title="Archivio_Task dentro allegati memotralci">
                        allegati/Archivio_Task
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-800/70 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                    <FolderOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Cartella Drive</div>
                      <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[110px]">
                        {GOOGLE_DEFAULTS.driveFolderName}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Azioni di Accesso / Sincronizzazione */}
              <div className="space-y-3">
                {!isConnected ? (
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isLoggingIn}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm shadow-lg shadow-teal-700/25 flex items-center justify-center space-x-2 transition disabled:opacity-50"
                  >
                    {isLoggingIn ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Apertura accesso sicuro Google...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Accedi con Google (Account Segreteria)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      onClick={handleSyncNow}
                      disabled={isSyncing}
                      className="flex-1 py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-700/20 flex items-center justify-center space-x-2 transition disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Sincronizzazione in corso...' : 'Sincronizza Adesso'}</span>
                    </button>
                    <button
                      onClick={handleGoogleDisconnect}
                      className="py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 font-bold text-xs transition border border-slate-200 dark:border-slate-700 flex items-center justify-center space-x-1.5"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Disconnetti</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs space-y-1.5">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Sincronizzazione Automatica Bidirezionale</span>
                </div>
                <p>
                  I dati di calendario e allegati sono preimpostati per l'account <strong>segreteria.cometralcinovara@gmail.com</strong>.
                  Basta effettuare l'accesso una sola volta con il pulsante sopra. La sincronizzazione si aggiorna
                  automaticamente in tempo reale.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Esporta Archivio Locale
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Scarica una copia di sicurezza completa in formato JSON contenente tutti gli eventi dell'agenda, le
                  cose da fare e i metadati degli allegati salvati sul dispositivo.
                </p>
                <button
                  onClick={handleExportBackup}
                  className="py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Scarica File Backup (JSON)</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Ripristina Archivio da File
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Seleziona un file di backup precedentemente scaricato per ripristinare il calendario e le attività.
                </p>
                <label className="inline-flex items-center space-x-2 py-2.5 px-4 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Seleziona File di Ripristino</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
