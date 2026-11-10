import React, { useState } from 'react'
import {
  Paperclip,
  Upload,
  Search,
  FileText,
  Image as ImageIcon,
  File,
  ExternalLink,
  Trash2,
  FolderOpen,
  Loader2,
} from 'lucide-react'
import type { UploadedAttachment } from '../types/attachment.ts'
import { formatFileSize, getFileTypeCategory } from '../utils/file.ts'
import { formatDateSafe } from '../utils/date.ts'

interface AttachmentsViewProps {
  attachments: UploadedAttachment[]
  onUploadFile: (file: File) => Promise<UploadedAttachment>
  onDeleteAttachment: (id: string) => void
  onPreviewAttachment: (att: any) => void
  isGoogleDriveConfigured: boolean
}

export const AttachmentsView: React.FC<AttachmentsViewProps> = ({
  attachments,
  onUploadFile,
  onDeleteAttachment,
  onPreviewAttachment,
  isGoogleDriveConfigured,
}) => {
  const [filterType, setFilterType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setIsUploading(true)
    try {
      for (const file of Array.from(files)) {
        await onUploadFile(file)
      }
    } finally {
      setIsUploading(false)
    }
  }

  const filteredAttachments = attachments.filter((att) => {
    const cat = getFileTypeCategory(att.mimeType, att.name)
    if (filterType !== 'all' && cat !== filterType) return false
    if (searchQuery.trim()) {
      if (!att.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    }
    return true
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-950/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center space-x-2">
              <span>Gestione Allegati & Documenti</span>
              <Paperclip className="w-5 h-5 text-indigo-200" />
            </h1>
            <p className="text-indigo-100 text-xs sm:text-sm mt-0.5">
              {attachments.length} file salvati •{' '}
              {isGoogleDriveConfigured
                ? '🟢 Sincronizzati su Google Drive'
                : '🟡 Archiviati in locale (Google Drive non configurato)'}
            </p>
          </div>

          <label className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 rounded-2xl font-bold text-xs shadow-md transition shrink-0 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Carica Nuovo File</span>
            <input
              type="file"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="sr-only"
              disabled={isUploading}
            />
          </label>
        </div>

        {/* Drag & Drop Upload Strip */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragActive(false)
            handleFiles(e.dataTransfer.files)
          }}
          className={`border-2 border-dashed rounded-2xl p-4 text-center transition ${
            dragActive
              ? 'border-white bg-white/20'
              : 'border-white/30 bg-white/10 hover:bg-white/15'
          }`}
        >
          {isUploading ? (
            <div className="flex items-center justify-center space-x-2 py-2">
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span className="text-xs font-semibold text-white">
                Caricamento in corso su Google Drive...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-1">
              <p className="text-xs font-semibold text-white">
                Trascina qui qualsiasi file (immagini, PDF, contratti, ricevute)
              </p>
              <p className="text-[11px] text-indigo-200 mt-0.5">
                Verranno salvati nella cartella Drive centralizzata
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Category filters */}
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto">
          {[
            { id: 'all', label: 'Tutti i file' },
            { id: 'image', label: 'Immagini' },
            { id: 'pdf', label: 'PDF' },
            { id: 'doc', label: 'Documenti' },
            { id: 'archive', label: 'Archivi' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterType(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                filterType === cat.id
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca nome file..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Files Grid */}
      {filteredAttachments.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
          <FolderOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
            Nessun allegato presente
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Carica un file o allegane uno direttamente durante la creazione di eventi o task.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredAttachments.map((att) => {
            const cat = getFileTypeCategory(att.mimeType, att.name)

            return (
              <div
                key={att.id}
                onClick={() => onPreviewAttachment(att)}
                className="group relative p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-start space-x-3 mb-3">
                  <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                    {cat === 'image' && <ImageIcon className="w-6 h-6" />}
                    {cat === 'pdf' && <FileText className="w-6 h-6" />}
                    {cat !== 'image' && cat !== 'pdf' && <File className="w-6 h-6" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4
                      className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 transition"
                      title={att.name}
                    >
                      {att.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {formatFileSize(att.size)} • {formatDateSafe(att.createdTime)}
                    </p>
                    <span
                      className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        att.isLocal
                          ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                      }`}
                    >
                      {att.isLocal ? 'Locale' : 'Google Drive'}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                    Apri anteprima
                  </span>

                  <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                    {att.webViewLink && (
                      <a
                        href={att.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        title="Apri su Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Vuoi eliminare l'allegato "${att.name}"?`)) {
                          onDeleteAttachment(att.id)
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                      title="Elimina allegato"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
