import React, { useEffect, useState } from 'react'
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  File,
  Loader2,
  Music,
  Film,
  FileSpreadsheet,
} from 'lucide-react'
import { localDB } from '../services/db.ts'
import { googleClientSide } from '../services/googleClientSide.ts'
import {
  formatFileSize,
  getFileTypeCategory,
  isTextFormat,
  dataUrlToBlob,
} from '../utils/file.ts'

interface AttachmentModalProps {
  attachment: {
    id: string
    name: string
    mimeType: string
    size: number
    url?: string
    webViewLink?: string
    webContentLink?: string
    isLocal?: boolean
  } | null
  onClose: () => void
}

export const AttachmentModal: React.FC<AttachmentModalProps> = ({ attachment, onClose }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!attachment) return

    let isMounted = true
    let createdObjectUrl: string | null = null
    setLoading(true)
    setPreviewUrl(null)
    setDownloadUrl(null)
    setTextContent(null)

    const category = getFileTypeCategory(attachment.mimeType, attachment.name)
    const isText = isTextFormat(attachment.mimeType, attachment.name)
    const isDriveFile =
      !attachment.isLocal &&
      Boolean(attachment.id) &&
      !attachment.id.startsWith('local_')

    async function loadData() {
      let blob: Blob | null = null

      // 1. Prova prima dalla cache locale IndexedDB
      if (attachment?.id) {
        const cached = await localDB.getCachedFileData(attachment.id)
        if (cached?.dataUrl) {
          blob = dataUrlToBlob(cached.dataUrl)
          if (!blob && isMounted) {
            setPreviewUrl(cached.dataUrl)
            setDownloadUrl(cached.dataUrl)
          }
        }
      }

      // 2. Se non in cache ed è su Google Drive, scarica il Blob autenticato in memoria (evita export=download!)
      if (!blob && isDriveFile && googleClientSide.isConnected() && attachment?.id) {
        const effectiveMime =
          category === 'pdf'
            ? 'application/pdf'
            : attachment.mimeType || 'application/octet-stream'
        blob = await googleClientSide.fetchDriveFileBlob(attachment.id, effectiveMime)
      }

      if (!isMounted) return

      if (blob) {
        createdObjectUrl = URL.createObjectURL(blob)
        setDownloadUrl(createdObjectUrl)

        if (isText) {
          try {
            const txt = await blob.text()
            if (isMounted) setTextContent(txt)
          } catch {}
        }

        // Per i PDF e documenti Office su Drive, /preview garantisce la resa inline anche su mobile
        if (
          isDriveFile &&
          (category === 'pdf' || (category === 'doc' && !isText))
        ) {
          setPreviewUrl(`https://drive.google.com/file/d/${attachment!.id}/preview`)
        } else {
          setPreviewUrl(createdObjectUrl)
        }
        setLoading(false)
        return
      }

      // 3. Fallback URL locale o Drive /preview (senza mai usare webContentLink come src di iframe!)
      if (isDriveFile && (category === 'pdf' || category === 'doc')) {
        setPreviewUrl(`https://drive.google.com/file/d/${attachment!.id}/preview`)
        setDownloadUrl(attachment?.webContentLink || attachment?.webViewLink || null)
      } else if (attachment?.url) {
        setPreviewUrl(attachment.url)
        setDownloadUrl(attachment.url)
      } else {
        setDownloadUrl(attachment?.webContentLink || null)
      }

      if (isMounted) setLoading(false)
    }

    loadData()
    return () => {
      isMounted = false
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl)
      }
    }
  }, [attachment])

  if (!attachment) return null

  const category = getFileTypeCategory(attachment.mimeType, attachment.name)
  const isText = isTextFormat(attachment.mimeType, attachment.name)
  const isCsv = attachment.name.toLowerCase().endsWith('.csv') || attachment.mimeType.includes('csv')
  const isDriveFile =
    !attachment.isLocal &&
    Boolean(attachment.id) &&
    !attachment.id.startsWith('local_')

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
              {category === 'video' && <Film className="w-5 h-5" />}
              {category === 'doc' && <FileSpreadsheet className="w-5 h-5" />}
              {category !== 'image' &&
                category !== 'pdf' &&
                category !== 'audio' &&
                category !== 'video' &&
                category !== 'doc' && <File className="w-5 h-5" />}
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

            {downloadUrl && (
              <a
                href={downloadUrl}
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
        <div className="flex-1 overflow-auto p-3 sm:p-4 flex items-center justify-center bg-slate-100/60 dark:bg-slate-950/60 min-h-[280px] sm:min-h-[360px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-xs font-bold">Caricamento anteprima...</p>
            </div>
          ) : category === 'image' && previewUrl ? (
            <img
              src={previewUrl}
              alt={attachment.name}
              className="max-w-full max-h-[68dvh] object-contain rounded-2xl shadow-md"
            />
          ) : category === 'pdf' && previewUrl ? (
            <div className="w-full h-[68dvh] flex flex-col">
              <iframe
                src={previewUrl}
                title={attachment.name}
                allow="autoplay"
                className="w-full flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white"
              />
            </div>
          ) : category === 'video' && previewUrl ? (
            <video
              controls
              playsInline
              src={previewUrl}
              className="max-w-full max-h-[68dvh] rounded-2xl shadow-lg bg-black"
            />
          ) : category === 'audio' && previewUrl ? (
            <div className="text-center p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg max-w-md w-full space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Music className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white truncate">
                  {attachment.name}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">File audio</p>
              </div>
              <audio controls src={previewUrl} className="w-full rounded-xl" />
            </div>
          ) : isText && textContent !== null ? (
            isCsv ? (
              <div className="w-full max-h-[68dvh] overflow-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <tbody>
                    {textContent
                      .split(/\r?\n/)
                      .filter((r) => r.trim().length > 0)
                      .slice(0, 200)
                      .map((row, rIdx) => {
                        const sep = row.includes(';') ? ';' : ','
                        const cells = row.split(sep)
                        return (
                          <tr
                            key={rIdx}
                            className={
                              rIdx === 0
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 font-black text-indigo-900 dark:text-indigo-200 sticky top-0'
                                : 'border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }
                          >
                            {cells.map((cell, cIdx) => (
                              <td key={cIdx} className="px-3 py-2 whitespace-nowrap">
                                {cell.replace(/^"|"$/g, '')}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <pre className="w-full max-h-[68dvh] overflow-auto p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-mono whitespace-pre-wrap break-words shadow-sm">
                {textContent}
              </pre>
            )
          ) : category === 'doc' && isDriveFile && previewUrl ? (
            <iframe
              src={previewUrl}
              title={attachment.name}
              allow="autoplay"
              className="w-full h-[68dvh] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white"
            />
          ) : (
            <div className="text-center py-12 px-6">
              <File className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                Anteprima non disponibile per questo formato
              </p>
              <p className="text-xs text-slate-500 mb-4 font-medium">
                Puoi scaricare il file o visualizzarlo direttamente sul Google Drive collegato.
              </p>
              {downloadUrl ? (
                <a
                  href={downloadUrl}
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
