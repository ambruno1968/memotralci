import React, { useEffect, useState } from 'react'
import { X, Download, ExternalLink, FileText, Image as ImageIcon, File, Loader2, Music } from 'lucide-react'
import { localDB } from '../services/db.ts'
import { formatFileSize, getFileTypeCategory } from '../utils/file.ts'

interface AttachmentModalProps {
  attachment: {
    id: string
    name: string
    mimeType: string
    size: number
    url?: string
    webViewLink?: string
    webContentLink?: string
  } | null
  onClose: () => void
}

export const AttachmentModal: React.FC<AttachmentModalProps> = ({ attachment, onClose }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!attachment) return

    let isMounted = true
    setLoading(true)

    async function loadData() {
      if (attachment?.id) {
        const cached = await localDB.getCachedFileData(attachment.id)
        if (cached && isMounted) {
          setDataUrl(cached.dataUrl)
          setLoading(false)
          return
        }
      }

      if (attachment?.url || attachment?.webContentLink) {
        if (isMounted) {
          setDataUrl(attachment.url || attachment.webContentLink || null)
          setLoading(false)
        }
      } else {
        if (isMounted) setLoading(false)
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [attachment])

  if (!attachment) return null

  const category = getFileTypeCategory(attachment.mimeType, attachment.name)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200 safe-top safe-bottom">
      <div className="relative w-full max-w-4xl max-h-[88dvh] sm:max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/60 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              {category === 'image' && <ImageIcon className="w-5 h-5" />}
              {category === 'pdf' && <FileText className="w-5 h-5" />}
              {category === 'audio' && <Music className="w-5 h-5" />}
              {category !== 'image' && category !== 'pdf' && category !== 'audio' && (
                <File className="w-5 h-5" />
              )}
            </div>
            <div className="truncate">
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {attachment.name}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {formatFileSize(attachment.size)} • {attachment.mimeType}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {attachment.webViewLink && (
              <a
                href={attachment.webViewLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl transition shadow-2xs"
                title="Apri su Google Drive"
              >
                <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">Google Drive</span>
              </a>
            )}

            {dataUrl && (
              <a
                href={dataUrl}
                download={attachment.name}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-xl transition border border-indigo-200"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Scarica</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100/60 dark:bg-slate-950/60 min-h-[320px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-xs font-bold">Caricamento anteprima...</p>
            </div>
          ) : category === 'image' && dataUrl ? (
            <img
              src={dataUrl}
              alt={attachment.name}
              className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-md"
            />
          ) : category === 'pdf' && dataUrl ? (
            <iframe
              src={dataUrl}
              title={attachment.name}
              className="w-full h-[70vh] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
            />
          ) : category === 'audio' && dataUrl ? (
            <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg max-w-md w-full space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Music className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  {attachment.name}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Nota vocale registrata</p>
              </div>
              <audio controls src={dataUrl} className="w-full rounded-xl" autoPlay />
            </div>
          ) : (
            <div className="text-center py-12 px-6">
              <File className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                Anteprima non disponibile per questo formato
              </p>
              <p className="text-xs text-slate-500 mb-4 font-medium">
                Puoi scaricare il file o visualizzarlo direttamente sul Google Drive collegato.
              </p>
              {dataUrl ? (
                <a
                  href={dataUrl}
                  download={attachment.name}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-md transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Scarica File</span>
                </a>
              ) : attachment.webViewLink ? (
                <a
                  href={attachment.webViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-md transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Apri su Google Drive</span>
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
