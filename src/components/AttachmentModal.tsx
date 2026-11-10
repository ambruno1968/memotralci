import React, { useEffect, useState } from 'react'
import { X, Download, ExternalLink, FileText, Image as ImageIcon, File, Loader2 } from 'lucide-react'
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
      // Check local cached blob
      if (attachment?.id) {
        const cached = await localDB.getCachedFileData(attachment.id)
        if (cached && isMounted) {
          setDataUrl(cached.dataUrl)
          setLoading(false)
          return
        }
      }

      // Check URL or webViewLink
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              {category === 'image' && <ImageIcon className="w-5 h-5" />}
              {category === 'pdf' && <FileText className="w-5 h-5" />}
              {category !== 'image' && category !== 'pdf' && <File className="w-5 h-5" />}
            </div>
            <div className="truncate">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                {attachment.name}
              </h3>
              <p className="text-xs text-slate-500">
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
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg transition"
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
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Scarica</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100/50 dark:bg-slate-950/50 min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-sm">Caricamento anteprima...</p>
            </div>
          ) : category === 'image' && dataUrl ? (
            <img
              src={dataUrl}
              alt={attachment.name}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
            />
          ) : category === 'pdf' && dataUrl ? (
            <iframe
              src={dataUrl}
              title={attachment.name}
              className="w-full h-[70vh] rounded-lg border border-slate-200 dark:border-slate-800"
            />
          ) : (
            <div className="text-center py-12 px-6">
              <File className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Anteprima non disponibile per questo formato
              </p>
              <p className="text-xs text-slate-500 mb-4">
                Puoi scaricare il file o visualizzarlo direttamente sul Google Drive collegato.
              </p>
              {dataUrl ? (
                <a
                  href={dataUrl}
                  download={attachment.name}
                  className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Scarica File</span>
                </a>
              ) : attachment.webViewLink ? (
                <a
                  href={attachment.webViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition"
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

