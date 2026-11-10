import React, { useState, useRef, useEffect } from 'react'
import { Mic, Square, Play, Pause, Trash2, Check, AlertCircle } from 'lucide-react'

interface AudioRecorderProps {
  onSaveAudio: (file: File) => void
  onCancel: () => void
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSaveAudio, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasPermissionError, setHasPermissionError] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<any>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  async function startRecording() {
    setHasPermissionError(false)
    setAudioBlob(null)
    setAudioUrl(null)
    audioChunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm'
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Permesso microfono non concesso o non supportato:', err)
      setHasPermissionError(true)
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  function togglePlayPreview() {
    if (!audioElementRef.current && audioUrl) {
      const audio = new Audio(audioUrl)
      audioElementRef.current = audio
      audio.onended = () => setIsPlaying(false)
    }

    if (audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.pause()
        setIsPlaying(false)
      } else {
        audioElementRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  function handleConfirm() {
    if (!audioBlob) return
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
      now.getHours()
    )}${pad(now.getMinutes())}`
    const ext = audioBlob.type.includes('mp4') || audioBlob.type.includes('m4a') ? 'm4a' : 'webm'
    const fileName = `Nota_Vocale_${timestamp}.${ext}`

    const audioFile = new File([audioBlob], fileName, { type: audioBlob.type })
    onSaveAudio(audioFile)
  }

  function formatSeconds(sec: number) {
    const mins = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center space-x-1.5">
          <Mic className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Registra Nota Vocale</span>
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          Annulla
        </button>
      </div>

      {hasPermissionError ? (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Accesso al microfono negato o non supportato nel browser.</span>
        </div>
      ) : isRecording ? (
        <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
              {formatSeconds(recordingTime)}
            </span>
            <span className="text-xs text-slate-500">Registrazione in corso...</span>
          </div>

          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
          >
            <Square className="w-3 h-3" />
            <span>Ferma</span>
          </button>
        </div>
      ) : audioBlob ? (
        <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-xs">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={togglePlayPreview}
              className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition"
              title="Ascolta anteprima"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>Nota vocale ({formatSeconds(recordingTime)})</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                setAudioBlob(null)
                setAudioUrl(null)
              }}
              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition"
              title="Cancella e registra di nuovo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Allega</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-3">
          <button
            type="button"
            onClick={startRecording}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            <span>Inizia Registrazione Vocale</span>
          </button>
        </div>
      )}
    </div>
  )
}
