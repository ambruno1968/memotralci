import React from 'react'
import {
  CalendarDays,
  CheckSquare,
  Paperclip,
  Plus,
  Download,
  Cloud,
  CloudOff,
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
}) => {
  return (
    <>
      {/* Desktop & Tablet Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectView('calendar')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                  MemoTralci
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">
                Agenda, To-Do & Allegati Google
              </p>
            </div>
          </div>

          {/* Center Navigation Pills (Desktop/Tablet) */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
            <button
              onClick={() => onSelectView('calendar')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                currentView === 'calendar'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Agenda & Calendario</span>
            </button>

            <button
              onClick={() => onSelectView('tasks')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition relative ${
                currentView === 'tasks'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
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
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Paperclip className="w-4 h-4" />
              <span>Allegati</span>
              {attachmentsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-[10px] font-bold">
                  {attachmentsCount}
                </span>
              )}
            </button>
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center space-x-2">
            {/* Install PWA Button if available */}
            {canInstallPwa && (
              <button
                onClick={onInstallPwa}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition"
                title="Installa questa app sul dispositivo"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Installa App</span>
              </button>
            )}

            {/* Google Sync Status Pill */}
            <button
              onClick={onOpenGoogleSettings}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                googleStatus.isGoogleConfigured
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
              }`}
              title="Apri impostazioni connessione Google"
            >
              {googleStatus.isGoogleConfigured ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="hidden sm:inline">Google Connesso</span>
                  <span className="sm:hidden">Google</span>
                </>
              ) : (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="hidden sm:inline">Modalità Locale</span>
                  <span className="sm:hidden">Configura</span>
                </>
              )}
            </button>

            {/* Quick Add Button */}
            <button
              onClick={currentView === 'tasks' ? onOpenTaskModal : onOpenEventModal}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition cursor-pointer"
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 safe-bottom">
        <div className="grid grid-cols-3 py-2 px-3">
          <button
            onClick={() => onSelectView('calendar')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition ${
              currentView === 'calendar'
                ? 'text-indigo-600 dark:text-indigo-400'
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
                ? 'text-emerald-600 dark:text-emerald-400'
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
                ? 'text-indigo-600 dark:text-indigo-400'
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
