import React, { useState } from 'react'
import {
  X,
  Share2,
  MessageCircle,
  Copy,
  Check,
  Image as ImageIcon,
  Calendar as CalendarIcon,
  StickyNote,
  Download,
} from 'lucide-react'
import appLogo from '../assets/logo-icon.png'
import { NOTE_COLORS, normalizeNoteCategories, type AppNoteItem } from '../types/note.ts'
import { categoryService } from '../services/categoryService.ts'
import { formatDateSafe } from '../utils/date.ts'
import { APP_CREDITS } from '../config/version.ts'

interface ShareNoteModalProps {
  note: AppNoteItem | null
  onClose: () => void
}

export const ShareNoteModal: React.FC<ShareNoteModalProps> = ({ note, onClose }) => {
  const [copied, setCopied] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)

  if (!note) return null

  const noteDateIso = note.updatedAt || note.createdAt
  const dateFormatted = formatDateSafe(noteDateIso, 'EEEE d MMMM yyyy')
  const capitalizedDate = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1)
  const noteCats = normalizeNoteCategories(note)
  const catLabels = noteCats.map((c) => categoryService.getCategoryStyle(c).label)
  const colorLabel = NOTE_COLORS[note.color || 'yellow'].label

  function buildFormattedText(): string {
    if (!note) return ''

    const lines: string[] = [
      `🌿 *COME TRALCI • NOTA*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📅 *${capitalizedDate}*`,
    ]

    if (catLabels.length > 0) {
      lines.push(`🏷️ *Categoria:* ${catLabels.join(', ')}`)
    }

    lines.push(``)
    if (note.title && note.title.trim()) {
      lines.push(`📌 *${note.title.trim().toUpperCase()}*`)
    }
    if (note.content && note.content.trim()) {
      lines.push(`📝 ${note.content.trim()}`)
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━`)
    lines.push(`_${APP_CREDITS.organization}_`)

    return lines.join('\n')
  }

  const formattedText = buildFormattedText()

  function handleWhatsAppShare() {
    const encoded = encodeURIComponent(formattedText)
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer')
  }

  async function handleCopyText() {
    try {
      await navigator.clipboard.writeText(formattedText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = formattedText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  // Genera locandina PNG elegante con Logo, Data e Testo della nota su Canvas
  async function generateNoteCardBlob(): Promise<Blob | null> {
    if (!note) return null
    const canvas = document.createElement('canvas')
    const width = 900
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const wrapText = (text: string, maxWidth: number, font: string): string[] => {
      ctx.font = font
      const paragraphs = text.split('\n')
      const allLines: string[] = []
      for (const p of paragraphs) {
        if (!p.trim()) {
          allLines.push('')
          continue
        }
        const words = p.split(' ')
        let currentLine = words[0] || ''
        for (let i = 1; i < words.length; i++) {
          const word = words[i]
          const w = ctx.measureText(currentLine + ' ' + word).width
          if (w < maxWidth) {
            currentLine += ' ' + word
          } else {
            allLines.push(currentLine)
            currentLine = word
          }
        }
        allLines.push(currentLine)
      }
      return allLines
    }

    const titleText = note.title?.trim() || ''
    const contentText = note.content?.trim() || ''

    const titleLines = titleText
      ? wrapText(titleText, width - 140, '900 34px system-ui, -apple-system, sans-serif')
      : []
    const contentLines = contentText
      ? wrapText(contentText, width - 140, '500 24px system-ui, -apple-system, sans-serif')
      : []

    const dynamicHeight =
      360 +
      (catLabels.length > 0 ? 40 : 0) +
      titleLines.length * 44 +
      (contentLines.length > 0 ? contentLines.length * 34 + 30 : 0)

    canvas.width = width
    canvas.height = Math.max(520, dynamicHeight)

    // Sfondo esterno elegante
    const bgGrad = ctx.createLinearGradient(0, 0, width, canvas.height)
    bgGrad.addColorStop(0, '#0f5b66')
    bgGrad.addColorStop(0.5, '#1e1b4b')
    bgGrad.addColorStop(1, '#311042')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, width, canvas.height)

    // Card bianca centrale
    const cardX = 36
    const cardY = 36
    const cardW = width - 72
    const cardH = canvas.height - 72

    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(cardX, cardY, cardW, cardH, 32)
    ctx.fill()

    // Fascia superiore colorata nella card
    const headerGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + 135)
    headerGrad.addColorStop(0, '#0d9488')
    headerGrad.addColorStop(0.5, '#4f46e5')
    headerGrad.addColorStop(1, '#7e22ce')
    ctx.fillStyle = headerGrad
    ctx.beginPath()
    ctx.roundRect(cardX, cardY, cardW, 135, [32, 32, 0, 0])
    ctx.fill()

    // Carica e disegna il Logo Come Tralci
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        img.onerror = () => resolve()
        img.src = appLogo
      })
      if (img.complete && img.naturalWidth > 0) {
        ctx.save()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.roundRect(cardX + 34, cardY + 22, 90, 90, 22)
        ctx.fill()

        ctx.beginPath()
        ctx.roundRect(cardX + 38, cardY + 26, 82, 82, 18)
        ctx.clip()
        ctx.drawImage(img, cardX + 38, cardY + 26, 82, 82)
        ctx.restore()
      }
    } catch {}

    // Testo Header accanto al logo
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 30px system-ui, -apple-system, sans-serif'
    ctx.fillText('COME TRALCI', cardX + 145, cardY + 65)

    ctx.fillStyle = '#e0e7ff'
    ctx.font = '700 18px system-ui, -apple-system, sans-serif'
    ctx.fillText('MemoTralci • Note & Appunti', cardX + 145, cardY + 95)

    // Box Data
    let cursorY = cardY + 180
    ctx.fillStyle = '#f0fdfa'
    ctx.strokeStyle = '#99f6e4'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(cardX + 34, cursorY - 34, cardW - 68, 56, 16)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#0f766e'
    ctx.font = '800 22px system-ui, -apple-system, sans-serif'
    ctx.fillText(`📅 ${capitalizedDate}   •   📝 Post-it ${colorLabel}`, cardX + 54, cursorY + 2)

    cursorY += 56

    // Categorie (se presenti)
    if (catLabels.length > 0) {
      ctx.fillStyle = '#6366f1'
      ctx.font = '800 18px system-ui, -apple-system, sans-serif'
      ctx.fillText(`🏷️ ${catLabels.join('  •  ').toUpperCase()}`, cardX + 38, cursorY)
      cursorY += 38
    }

    // Titolo Nota
    if (titleLines.length > 0) {
      ctx.fillStyle = '#0f172a'
      ctx.font = '900 34px system-ui, -apple-system, sans-serif'
      for (const line of titleLines) {
        ctx.fillText(line, cardX + 38, cursorY + 10)
        cursorY += 44
      }
      cursorY += 8
    }

    // Contenuto Nota
    if (contentLines.length > 0) {
      ctx.fillStyle = '#334155'
      ctx.font = '500 24px system-ui, -apple-system, sans-serif'
      for (const line of contentLines) {
        ctx.fillText(line, cardX + 38, cursorY + 6)
        cursorY += 34
      }
    }

    // Footer della card
    ctx.fillStyle = '#94a3b8'
    ctx.font = '600 16px system-ui, -apple-system, sans-serif'
    ctx.fillText(
      `${APP_CREDITS.organization} • Sviluppato da ${APP_CREDITS.developedBy}`,
      cardX + 38,
      cardY + cardH - 24
    )

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95)
    })
  }

  function buildFileName(prefix: string): string {
    const base = (note?.title || note?.content || 'nota')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 25)
    return `${prefix}_${base || 'nota'}.png`
  }

  async function handleShareWithCardImage() {
    setIsGeneratingImage(true)
    try {
      const blob = await generateNoteCardBlob()
      const fileName = buildFileName('nota')

      if (blob && navigator.share) {
        const file = new File([blob], fileName, { type: 'image/png' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: note?.title || 'Nota Come Tralci',
            text: formattedText,
            files: [file],
          })
          return
        }
        await navigator.share({
          title: note?.title || 'Nota Come Tralci',
          text: formattedText,
        })
        return
      }

      // Fallback su desktop se Web Share file non è supportato: scarica la locandina PNG e apre WhatsApp
      if (blob) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      }
      handleWhatsAppShare()
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        handleWhatsAppShare()
      }
    } finally {
      setIsGeneratingImage(false)
    }
  }

  async function handleDownloadCardImage() {
    setIsGeneratingImage(true)
    try {
      const blob = await generateNoteCardBlob()
      if (!blob) return
      const fileName = buildFileName('come_tralci_nota')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setIsGeneratingImage(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150 safe-top safe-bottom"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-white/60 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88dvh] sm:max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-2xl bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
          title="Chiudi"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ANTEPRIMA GRAFICA CON LOGO E CONTENUTO NOTA */}
        <div className="p-5 sm:p-6 bg-gradient-to-br from-teal-700 via-indigo-800 to-purple-900 text-white">
          <div className="flex items-center space-x-3.5">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white p-0.5 shadow-xl ring-2 ring-white/40 shrink-0">
              <img src={appLogo} alt="Come Tralci" className="w-full h-full object-cover rounded-xl" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/20 text-teal-100">
                Come Tralci • Nota
              </span>
              <h3 className="text-lg sm:text-xl font-black tracking-tight mt-1">
                Condividi Nota
              </h3>
              <p className="text-xs text-indigo-100 font-medium">
                {APP_CREDITS.organization}
              </p>
            </div>
          </div>
        </div>

        {/* Corpo Card Formattata */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Card Elegante di Anteprima */}
          <div className="rounded-2xl border-2 border-teal-500/30 dark:border-teal-500/40 bg-gradient-to-b from-teal-50/50 to-white dark:from-slate-800/90 dark:to-slate-900 p-4 sm:p-5 shadow-md space-y-3">
            {/* Barra Data e Tipo */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center space-x-2 text-teal-800 dark:text-teal-300 font-black text-xs sm:text-sm capitalize">
                <CalendarIcon className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{capitalizedDate}</span>
              </div>
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-amber-100/80 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-black text-xs">
                <StickyNote className="w-3.5 h-3.5" />
                <span>Post-it {colorLabel}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {/* Categorie */}
              {noteCats.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {noteCats.map((catId) => {
                    const s = categoryService.getCategoryStyle(catId)
                    return (
                      <span
                        key={catId}
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${s.badge}`}
                      >
                        {s.label}
                      </span>
                    )
                  })}
                </div>
              )}

              {/* Titolo */}
              {note.title && note.title.trim() && (
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                  {note.title}
                </h4>
              )}

              {/* Testo Nota */}
              {note.content && note.content.trim() && (
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed bg-white/80 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  {note.content}
                </p>
              )}
            </div>
          </div>

          {/* Pulsanti Azione Condivisione */}
          <div className="space-y-2.5 pt-1">
            {/* 1. Invia su WhatsApp (Testo formattato) */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="w-full flex items-center justify-center space-x-2.5 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/25 transition cursor-pointer"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Invia su WhatsApp (Messaggio Formattato)</span>
            </button>

            {/* 2. Condividi Locandina con Logo + Testo (Web Share / Immagine) */}
            <button
              type="button"
              onClick={handleShareWithCardImage}
              disabled={isGeneratingImage}
              className="w-full flex items-center justify-center space-x-2.5 py-3 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:opacity-60"
            >
              <Share2 className="w-4 h-4" />
              <span>
                {isGeneratingImage
                  ? 'Generazione locandina con logo...'
                  : 'Condividi Card con Logo (WhatsApp / App)'}
              </span>
            </button>

            {/* 3. Azioni secondarie: Scarica Immagine con Logo & Copia Testo */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleDownloadCardImage}
                disabled={isGeneratingImage}
                className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-teal-600" />
                <Download className="w-3.5 h-3.5" />
                <span>Scarica Card PNG</span>
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-600 dark:text-emerald-400">Testo Copiato!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-indigo-600" />
                    <span>Copia Testo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

