import React from 'react'
import appLogo from '../assets/logo-icon.png'
import {
  CalendarDays,
  CheckSquare,
  Paperclip,
  Plus,
  Download,
  Cloud,
  CloudOff,
  Sun,
  Moon,
  RefreshCw,
} from 'lucide-react'
import type { GoogleStatus } from '../services/api.ts'

export type NavView = 'calendar' | 'tasks' | 'attachments'

interface NavbarProps {
  currentView: NavView
  onSelectView: (view: NavView) => void
  onOpenGoogleSettings: () => void
  onOpenEventModal: () => void
  onOpenTaskModal: () => void
  googleStatus: GoogleStatus
  attachmentsCount: number
  tasksPendingCount: number
  canInstallPwa: boolean
  onInstallPwa: () => void
  isDark: boolean
  onToggleDark: () => void
  onSync?: () => void
  isSyncing?: boolean
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  onOpenGoogleSettings,
  onOpenEventModal,
  onOpenTaskModal,
  googleStatus,
  attachmentsCount,
  tasksPendingCount,
  canInstallPwa,
  onInstallPwa,
  isDark,
  onToggleDark,
  onSync,
  isSyncing = false,
}) => {
  return (
    <>
      {/* Desktop & Tablet Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/90 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => onSelectView('calendar')}
          >
            <div className="relative w-10 h-10 rounded-2xl overflow-hidden shadow-lg shadow-teal-900/25 group-hover:scale-105 transition ring-1 ring-teal-500/30 flex items-center justify-center bg-white dark:bg-slate-800 shrink-0">
              <img
                src={appLogo}
                alt="MemoTralci"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-base font-black tracking-tight bg-gradient-to-r from-teal-800 via-teal-600 to-emerald-600 dark:from-teal-300 dark:via-teal-200 dark:to-emerald-300 bg-clip-text text-transparent">
                  MemoTralci
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-0.5 hidden sm:block font-medium">
                Agenda • Calendario • Note
              </p>
            </div>
          </div>

          {/* Center Navigation Pills (Desktop/Tablet) */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-inner">
            <button
              onClick={() => onSelectView('calendar')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                currentView === 'calendar'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarDays className="w-4 h-4 text-indigo-500" />
              <span>Agenda & Calendario</span>
            </button>

            <button
              onClick={() => onSelectView('tasks')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition relative ${
                currentView === 'tasks'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-emerald-500" />
              <span>Cose da Fare</span>
              {tasksPendingCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {tasksPendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectView('attachments')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                currentView === 'attachments'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Paperclip className="w-4 h-4 text-purple-500" />
              <span>Allegati</span>
              {attachmentsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                  {attachmentsCount}
                </span>
              )}
            </button>
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center space-x-2">
            {/* Dark Mode Switcher */}
            <button
              type="button"
              onClick={onToggleDark}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition shadow-xs cursor-pointer"
              title={isDark ? 'Passa al tema Chiaro' : 'Passa al tema Scuro'}
              aria-label="Toggle tema scuro/chiaro"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* Install PWA Button if available */}
            {canInstallPwa && (
              <button
                onClick={onInstallPwa}
                className="hidden sm:flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition shadow-xs"
                title="Installa questa app sul dispositivo"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Installa</span>
              </button>
            )}

            {/* Manual Sync Button */}
            {onSync && (
              <button
                type="button"
                onClick={onSync}
                disabled={isSyncing}
                className={`p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-300 transition shadow-xs cursor-pointer ${
                  isSyncing ? 'opacity-60 cursor-not-allowed' : ''
                }`}
                title="Sincronizza subito in entrambe le direzioni con Google Calendar e Drive"
                aria-label="Sincronizza"
              >
                <RefreshCw
                  className={`w-4 h-4 text-teal-600 dark:text-teal-400 ${
                    isSyncing ? 'animate-spin' : ''
                  }`}
                />
              </button>
            )}

            {/* Google Sync Status Pill */}
            <button
              onClick={onOpenGoogleSettings}
              className={`flex items-center space-x-2 px-3 py-2 rounded-2xl border text-xs font-bold transition shadow-xs cursor-pointer ${
                googleStatus.isGoogleConfigured
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
              }`}
              title="Apri impostazioni connessione Google"
            >
              {googleStatus.isGoogleConfigured ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="hidden sm:inline">
                    {googleStatus.resolvedCalendar || 'Segreteria'}
                  </span>
                  <span className="sm:hidden">Google</span>
                </>
              ) : (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="hidden sm:inline">Configura Google</span>
                  <span className="sm:hidden">Locale</span>
                </>
              )}
            </button>

            {/* Quick Add Button */}
            <button
              onClick={currentView === 'tasks' ? onOpenTaskModal : onOpenEventModal}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs shadow-md shadow-indigo-500/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">
                {currentView === 'tasks' ? 'Nuova Task' : 'Nuovo Evento'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 safe-bottom shadow-lg">
        <div className="grid grid-cols-3 py-2 px-3">
          <button
            onClick={() => onSelectView('calendar')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition ${
              currentView === 'calendar'
                ? 'text-indigo-600 dark:text-indigo-400 font-black'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <CalendarDays className="w-5 h-5 mb-0.5" />
            <span>Calendario</span>
          </button>

          <button
            onClick={() => onSelectView('tasks')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition relative ${
              currentView === 'tasks'
                ? 'text-emerald-600 dark:text-emerald-400 font-black'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="relative">
              <CheckSquare className="w-5 h-5 mb-0.5" />
              {tasksPendingCount > 0 && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {tasksPendingCount}
                </span>
              )}
            </div>
            <span>Cose da Fare</span>
          </button>

          <button
            onClick={() => onSelectView('attachments')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition ${
              currentView === 'attachments'
                ? 'text-purple-600 dark:text-purple-400 font-black'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Paperclip className="w-5 h-5 mb-0.5" />
            <span>Allegati</span>
          </button>
        </div>
      </div>
    </>
  )
}
