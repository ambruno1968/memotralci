import React, { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

interface PwaInstallBannerProps {
  canInstall: boolean
  onInstall: () => void
}

export const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({ canInstall, onInstall }) => {
  const [isIos, setIsIos] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const isIosDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone

    if (isIosDevice && !isStandalone) {
      setIsIos(true)
    }
  }, [])

  if (dismissed || (!canInstall && !isIos)) return null

  return (
    <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white px-4 py-3 relative z-30 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3 text-center sm:text-left">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/30 flex items-center justify-center shrink-0">
            <Download className="w-4 h-4 text-indigo-300" />
          </div>
          <div>
            <p className="font-bold text-sm">Installa MemoTralci come App (PWA)</p>
            <p className="text-slate-300 text-xs">
              {isIos
                ? 'Tocca l\'icona Condividi in basso e seleziona "Aggiungi a schermata Home" per usarla come app.'
                : 'Installa l\'applicazione sul tuo telefono o computer per usarla anche offline e a schermo intero.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {canInstall && (
            <button
              onClick={onInstall}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-sm transition"
            >
              Installa Ora
            </button>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            title="Chiudi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
