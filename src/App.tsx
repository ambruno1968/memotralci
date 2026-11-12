import { useState, useEffect } from 'react'
import { Navbar, type NavView } from './components/Navbar.tsx'
import { CalendarView } from './components/CalendarView.tsx'
import { TaskListView } from './components/TaskListView.tsx'
import { NotesView } from './components/NotesView.tsx'
import { AttachmentsView } from './components/AttachmentsView.tsx'
import { EventModal } from './components/EventModal.tsx'
import { TaskModal } from './components/TaskModal.tsx'
import { NoteModal } from './components/NoteModal.tsx'
import { AttachmentModal } from './components/AttachmentModal.tsx'
import { GoogleSettingsModal } from './components/GoogleSettingsModal.tsx'
import { PwaInstallBanner } from './components/PwaInstallBanner.tsx'
import {
  UpcomingDeadlinesModal,
  getTomorrowDeadlinesCount,
} from './components/UpcomingDeadlinesModal.tsx'
import type { AppCalendarEvent } from './types/event.ts'
import type { AppTaskItem } from './types/task.ts'
import type { AppNoteItem, NoteColor } from './types/note.ts'
import type { UploadedAttachment } from './types/attachment.ts'
import { api, clearAppCaches, type GoogleStatus } from './services/api.ts'
import { googleClientSide } from './services/googleClientSide.ts'
import { categoryService } from './services/categoryService.ts'
import { notificationService } from './services/notifications.ts'
import { Loader2, CheckCircle } from 'lucide-react'
import { APP_VERSION, APP_CREDITS } from './config/version.ts'

function normalizeTaskCategories(task: AppTaskItem): string[] {
  if (Array.isArray(task.categories) && task.categories.length > 0) {
    return task.categories.filter((c) => c && c.trim().length > 0 && c.trim().toLowerCase() !== 'altro')
  }
  if (typeof task.category === 'string' && task.category.trim()) {
    return task.category
      .split(',')
      .map((s) => s.trim())
      .filter((c) => Boolean(c) && c.toLowerCase() !== 'altro')
  }
  return []
}

function sameCategoryLists(a?: string[], b?: string[]): boolean {
  const listA = [...(a || [])].sort()
  const listB = [...(b || [])].sort()
  return listA.length === listB.length && listA.every((v, i) => v === listB[i])
}

export function App() {
  const [currentView, setCurrentView] = useState<NavView>('calendar')
  const [events, setEvents] = useState<AppCalendarEvent[]>([])
  const [tasks, setTasks] = useState<AppTaskItem[]>([])
  const [notes, setNotes] = useState<AppNoteItem[]>([])
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([])
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus>({
    isOnline: false,
    isGoogleConfigured: false,
    calendarId: null,
    driveFolderId: null,
    serviceAccountConfigured: false,
  })
  const [loading, setLoading] = useState(true)

  // Dark mode state
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem('memotralci_theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  function handleToggleDark() {
    setIsDark((prev) => {
      const next = !prev
      if (next) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('memotralci_theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('memotralci_theme', 'light')
      }
      return next
    })
  }

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('memotralci_theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('memotralci_theme', 'light')
    }
  }, [isDark])

  // Modals state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<AppCalendarEvent | null>(null)
  const [eventInitialDate, setEventInitialDate] = useState<string | undefined>()

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<AppTaskItem | null>(null)

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<AppNoteItem | null>(null)

  const [isGoogleSettingsOpen, setIsGoogleSettingsOpen] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState<any | null>(null)
  const [isDeadlinesOpen, setIsDeadlinesOpen] = useState(false)

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [canInstallPwa, setCanInstallPwa] = useState(false)

  // Listen for PWA beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstallPwa(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  function handleInstallPwa() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        setCanInstallPwa(false)
      }
      setDeferredPrompt(null)
    })
  }

  // Bidirectional Sync state
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncNotice, setSyncNotice] = useState<string | null>(null)

  // Load Data with Bidirectional Sync and Category / Cache Refresh
  async function loadAllData(showSyncIndicator = false, purgeCache = false) {
    if (showSyncIndicator) setIsSyncing(true)
    try {
      if (purgeCache || showSyncIndicator) {
        await clearAppCaches()
        await categoryService.syncWithDrive()
      }

      const [status, fetchedEvents, fetchedTasks, fetchedNotes, fetchedAttachments] = await Promise.all([
        api.getStatus(),
        api.getEvents(),
        api.getTasks(),
        api.getNotes(),
        api.getAttachments(),
      ])

      // Se non avevamo ancora sincronizzato le categorie (es. sync automatico normale), sincronizzale in background se connesso
      if (!purgeCache && !showSyncIndicator && status.isGoogleConfigured) {
        categoryService.syncWithDrive().catch(() => {})
      }

      setGoogleStatus(status)
      setEvents(fetchedEvents)
      setTasks(fetchedTasks)
      setNotes(fetchedNotes)

      // Eredita la categoria dal task associato se l'allegato non ha ancora categorie assegnate
      const taskCatByAttId = new Map<string, string[]>()
      for (const t of fetchedTasks) {
        const tCats = normalizeTaskCategories(t)
        if (tCats.length > 0 && Array.isArray(t.attachments)) {
          for (const att of t.attachments) {
            if (att?.id && !taskCatByAttId.has(att.id)) {
              taskCatByAttId.set(att.id, tCats)
            }
          }
        }
      }
      const syncedAttachments = fetchedAttachments.map((att) => {
        const existingCats = Array.isArray(att.categories) ? att.categories : []
        if (existingCats.length === 0 && taskCatByAttId.has(att.id)) {
          const inherited = taskCatByAttId.get(att.id)!
          return {
            ...att,
            categories: inherited,
            category: inherited.join(','),
          }
        }
        return att
      })
      setAttachments(syncedAttachments)

      // Check upcoming event & task reminders
      notificationService.checkReminders(fetchedEvents, fetchedTasks)

      // Apri automaticamente l'elenco scadenze se ci sono impegni/task previsti per domani (una volta per sessione)
      const tomorrowCount = getTomorrowDeadlinesCount(fetchedEvents, fetchedTasks)
      if (tomorrowCount > 0) {
        const todayKey = `memotralci_deadlines_auto_${new Date().toISOString().slice(0, 10)}`
        if (!sessionStorage.getItem(todayKey)) {
          sessionStorage.setItem(todayKey, 'true')
          setIsDeadlinesOpen(true)
        }
      }

      if (showSyncIndicator) {
        const calName = status.resolvedCalendar || status.calendarId || 'Google Calendar'
        if (googleClientSide.lastAuthError) {
          setSyncNotice('Sessione Google scaduta: tocca "Google" in alto per rinnovare la sincronizzazione')
        } else {
          setSyncNotice(
            status.isGoogleConfigured
              ? `Sincronizzato con Google Calendar & Drive (${calName})`
              : 'Sincronizzato con archivio locale'
          )
        }
        setTimeout(() => setSyncNotice(null), 4500)
      }
    } catch (err) {
      console.error('Errore caricamento dati:', err)
    } finally {
      setLoading(false)
      if (showSyncIndicator) setIsSyncing(false)
    }
  }

  // Initial load and URL check
  useEffect(() => {
    // Check if returned from Google OAuth
    const params = new URLSearchParams(window.location.search)
    const justConnected = params.get('google_connected') === 'true'
    if (justConnected) {
      window.history.replaceState({}, '', window.location.pathname)
    }

    // All'accesso o primo avvio di sessione, pulisce la cache completamente in automatico e sincronizza
    const sessionCacheCleared = sessionStorage.getItem('memotralci_cache_cleared_v2_3_0')
    if (!sessionCacheCleared || justConnected) {
      sessionStorage.setItem('memotralci_cache_cleared_v2_3_0', 'true')
      loadAllData(justConnected, true)
    } else {
      loadAllData()
    }
  }, [])

  // Auto-poll Google Calendar every 25 seconds for bidirectional sync
  useEffect(() => {
    const interval = setInterval(() => {
      loadAllData(false)
    }, 25000)
    return () => clearInterval(interval)
  }, [])

  // Auto-sync when window regains focus or tab becomes active
  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        loadAllData(false)
      }
    }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [])

  async function handleManualSync() {
    await loadAllData(true, true)
  }

  // Event handlers
  function handleOpenEventModal(event?: AppCalendarEvent, initialDate?: string) {
    setSelectedEvent(event || null)
    setEventInitialDate(initialDate)
    setIsEventModalOpen(true)
  }

  function handleSaveEvent(savedEvent: AppCalendarEvent) {
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === savedEvent.id)
      if (exists) {
        return prev.map((e) => (e.id === savedEvent.id ? savedEvent : e))
      }
      return [savedEvent, ...prev]
    })

    if (savedEvent.attachments && savedEvent.attachments.length > 0) {
      setAttachments((prev) => {
        const existingIds = new Set(prev.map((a) => a.id))
        const newOnes = savedEvent.attachments!
          .filter((a) => !existingIds.has(a.id))
          .map((a) => ({
            id: a.id,
            name: a.name,
            mimeType: a.mimeType,
            size: a.size,
            webViewLink: a.webViewLink,
            webContentLink: a.webContentLink,
            createdTime: new Date().toISOString(),
            isLocal: a.isLocal,
          }))
        return [...newOnes, ...prev]
      })
    }
  }

  async function handleDeleteEvent(eventId: string) {
    setEvents((prev) => prev.filter((e) => e.id !== eventId))
    await api.deleteEvent(eventId)
  }

  // Task handlers
  function handleOpenTaskModal(task?: AppTaskItem) {
    setSelectedTask(task || null)
    setIsTaskModalOpen(true)
  }

  async function handleSaveTask(task: AppTaskItem) {
    const prevTask = tasks.find((t) => t.id === task.id)
    const prevCats = prevTask ? normalizeTaskCategories(prevTask) : []
    const nextCats = normalizeTaskCategories(task)
    const catsChanged = !sameCategoryLists(prevCats, nextCats)

    const saved = await api.saveTask(task)
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === task.id)
      if (exists) {
        return prev.map((t) => (t.id === task.id ? saved : t))
      }
      return [saved, ...prev]
    })

    if (saved.attachments && saved.attachments.length > 0) {
      const attachedIds = new Set(saved.attachments.map((a) => a.id))

      setAttachments((prev) => {
        const existingMap = new Map(prev.map((a) => [a.id, a]))
        const updatedPrev = prev.map((att) => {
          if (!attachedIds.has(att.id)) return att
          // Se la categoria del task è cambiata, o se il task ha categorie e l'allegato è vuoto, aggiorna l'allegato
          const currentAttCats = Array.isArray(att.categories) ? att.categories : []
          const shouldSync =
            catsChanged || (nextCats.length > 0 && currentAttCats.length === 0)
          if (!shouldSync) return att
          return {
            ...att,
            categories: nextCats,
            category: nextCats.length > 0 ? nextCats.join(',') : undefined,
          }
        })

        const newOnes = saved.attachments!
          .filter((a) => !existingMap.has(a.id))
          .map((a) => ({
            id: a.id,
            name: a.name,
            mimeType: a.mimeType,
            size: a.size,
            webViewLink: a.webViewLink,
            webContentLink: a.webContentLink,
            createdTime: new Date().toISOString(),
            isLocal: a.isLocal,
            categories: nextCats,
            category: nextCats.length > 0 ? nextCats.join(',') : undefined,
          }))

        return [...newOnes, ...updatedPrev]
      })

      // Persisti su IndexedDB / Google Drive le categorie aggiornate degli allegati associati
      for (const att of saved.attachments) {
        const existingAtt = attachments.find((a) => a.id === att.id)
        const currentAttCats = Array.isArray(existingAtt?.categories) ? existingAtt!.categories : []
        if (catsChanged || !existingAtt || (nextCats.length > 0 && currentAttCats.length === 0)) {
          api.updateAttachmentCategories(att.id, nextCats).catch(() => {})
        }
      }
    }
  }

  async function handleToggleTask(taskId: string) {
    const target = tasks.find((t) => t.id === taskId)
    if (!target) return
    const toggled = { ...target, completed: !target.completed }
    setTasks((prev) => prev.map((t) => (t.id === taskId ? toggled : t)))
    await api.saveTask(toggled)
  }

  async function handleDeleteTask(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    await api.deleteTask(taskId)
  }

  async function handleQuickAddTask(title: string) {
    const newTask: AppTaskItem = {
      id: `task_${Date.now()}`,
      title,
      completed: false,
      priority: 'media',
      category: 'lavoro',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const saved = await api.createTask(newTask)
    setTasks((prev) => [saved, ...prev.filter((t) => t.id !== saved.id)])
  }

  // Note (Post-it) handlers
  function handleOpenNoteModal(note?: AppNoteItem) {
    setSelectedNote(note || null)
    setIsNoteModalOpen(true)
  }

  async function handleSaveNote(note: AppNoteItem) {
    setNotes((prev) => {
      const exists = prev.some((n) => n.id === note.id)
      if (exists) {
        return prev.map((n) => (n.id === note.id ? note : n))
      }
      return [note, ...prev]
    })
    await api.saveNote(note)
  }

  async function handleQuickAddNote(content: string, color: NoteColor, categoryId?: string) {
    const now = new Date().toISOString()
    const cats = categoryId ? [categoryId] : []
    const newNote: AppNoteItem = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      content,
      color,
      pinned: false,
      categories: cats,
      category: categoryId || undefined,
      createdAt: now,
      updatedAt: now,
    }
    setNotes((prev) => [newNote, ...prev])
    await api.saveNote(newNote)
  }

  async function handleTogglePinNote(id: string) {
    const target = notes.find((n) => n.id === id)
    if (!target) return
    const updated: AppNoteItem = {
      ...target,
      pinned: !target.pinned,
      updatedAt: new Date().toISOString(),
    }
    setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)))
    await api.saveNote(updated)
  }

  async function handleDeleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    await api.deleteNote(id)
  }

  // Create Calendar Event from Task
  async function handleCreateCalendarEventFromTask(task: AppTaskItem) {
    if (!task.dueDate) return
    const newEvt = await api.createEvent({
      title: `Task: ${task.title}`,
      description: task.description || '',
      start: task.dueDate,
      end: task.dueDate,
      allDay: true,
      category: 'lavoro',
      attachments: task.attachments,
    })
    setEvents((prev) => [newEvt, ...prev])
    alert(`Evento creato nel calendario per il ${task.dueDate}!`)
  }

  // Attachment handlers
  async function handleUploadFile(file: File, categories: string[] = []) {
    const uploaded = await api.uploadFile(file, categories)
    setAttachments((prev) => [uploaded, ...prev])
    return uploaded
  }

  async function handleUpdateAttachmentCategories(id: string, categories: string[]) {
    const cleanCats = categories.filter((c) => c && c.trim().length > 0)

    // 1. Aggiorna l'allegato
    setAttachments((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, categories: cleanCats, category: cleanCats.length > 0 ? cleanCats.join(',') : undefined }
          : a
      )
    )
    await api.updateAttachmentCategories(id, cleanCats)

    // 2. Se l'allegato è associato a uno o più task, aggiorna in automatico la categoria anche sul task (e sugli altri suoi allegati)
    const linkedTasks = tasks.filter((t) => t.attachments?.some((a) => a.id === id))
    if (linkedTasks.length > 0) {
      const siblingAttIds = new Set<string>()
      const updatedTasksList: AppTaskItem[] = []

      for (const lt of linkedTasks) {
        const updatedTask: AppTaskItem = {
          ...lt,
          categories: cleanCats,
          category: cleanCats.length > 0 ? cleanCats.join(',') : undefined,
          updatedAt: new Date().toISOString(),
        }
        updatedTasksList.push(updatedTask)
        lt.attachments?.forEach((a) => {
          if (a.id !== id) siblingAttIds.add(a.id)
        })
      }

      const updatedTaskMap = new Map(updatedTasksList.map((t) => [t.id, t]))
      setTasks((prev) => prev.map((t) => updatedTaskMap.get(t.id) || t))

      if (siblingAttIds.size > 0) {
        setAttachments((prev) =>
          prev.map((a) =>
            siblingAttIds.has(a.id)
              ? {
                  ...a,
                  categories: cleanCats,
                  category: cleanCats.length > 0 ? cleanCats.join(',') : undefined,
                }
              : a
          )
        )
      }

      for (const ut of updatedTasksList) {
        api.saveTask(ut).catch(() => {})
      }
      for (const sibId of siblingAttIds) {
        api.updateAttachmentCategories(sibId, cleanCats).catch(() => {})
      }
    }
  }

  async function handleDeleteAttachment(id: string) {
    await api.deleteAttachment(id)
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const pendingTasksCount = tasks.filter((t) => !t.completed).length

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      {/* PWA Install Banner */}
      <PwaInstallBanner canInstall={canInstallPwa} onInstall={handleInstallPwa} />

      {/* Navbar */}
      <Navbar
        currentView={currentView}
        onSelectView={setCurrentView}
        onOpenGoogleSettings={() => setIsGoogleSettingsOpen(true)}
        onOpenEventModal={() => handleOpenEventModal()}
        onOpenTaskModal={() => handleOpenTaskModal()}
        googleStatus={googleStatus}
        attachmentsCount={attachments.length}
        tasksPendingCount={pendingTasksCount}
        notesCount={notes.length}
        canInstallPwa={canInstallPwa}
        onInstallPwa={handleInstallPwa}
        isDark={isDark}
        onToggleDark={handleToggleDark}
        onSync={handleManualSync}
        isSyncing={isSyncing}
        onOpenDeadlines={() => setIsDeadlinesOpen(true)}
        tomorrowDeadlinesCount={getTomorrowDeadlinesCount(events, tasks)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-3 sm:py-8 overflow-x-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 text-slate-400">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-3" />
            <p className="text-sm font-black text-slate-600 dark:text-slate-300">
              Caricamento MemoTralci...
            </p>
          </div>
        ) : (
          <>
            {currentView === 'calendar' && (
              <CalendarView
                events={events}
                tasks={tasks}
                onOpenEventModal={handleOpenEventModal}
                onOpenTaskModal={handleOpenTaskModal}
              />
            )}

            {currentView === 'tasks' && (
              <TaskListView
                tasks={tasks}
                onToggleTask={handleToggleTask}
                onOpenTaskModal={handleOpenTaskModal}
                onDeleteTask={handleDeleteTask}
                onPreviewAttachment={(att) => setPreviewAttachment(att)}
                onCreateCalendarEvent={handleCreateCalendarEventFromTask}
                onQuickAddTask={handleQuickAddTask}
              />
            )}

            {currentView === 'notes' && (
              <NotesView
                notes={notes}
                onOpenNoteModal={handleOpenNoteModal}
                onQuickAddNote={handleQuickAddNote}
                onTogglePinNote={handleTogglePinNote}
                onDeleteNote={handleDeleteNote}
              />
            )}

            {currentView === 'attachments' && (
              <AttachmentsView
                attachments={attachments}
                onUploadFile={handleUploadFile}
                onDeleteAttachment={handleDeleteAttachment}
                onUpdateAttachmentCategories={handleUpdateAttachmentCategories}
                onPreviewAttachment={(att) => setPreviewAttachment(att)}
                isGoogleDriveConfigured={googleStatus.isGoogleConfigured}
              />
            )}
          </>
        )}
      </main>

      {/* Footer con Versione e Crediti */}
      <footer className="mt-auto border-t border-slate-200/60 dark:border-slate-800 pt-4 pb-24 md:py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 flex flex-col sm:flex-row items-center justify-between gap-2 font-medium">
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:space-x-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">MemoTralci</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
              {APP_VERSION}
            </span>
            <span>•</span>
            <span>{APP_CREDITS.developedFor}</span>
          </div>
          <div>
            <span>{APP_CREDITS.copyright}</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {isEventModalOpen && (
        <EventModal
          event={selectedEvent}
          initialDate={eventInitialDate}
          onClose={() => {
            setIsEventModalOpen(false)
            setSelectedEvent(null)
          }}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          onPreviewAttachment={(att) => setPreviewAttachment(att)}
        />
      )}

      {isTaskModalOpen && (
        <TaskModal
          task={selectedTask}
          onClose={() => {
            setIsTaskModalOpen(false)
            setSelectedTask(null)
          }}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onPreviewAttachment={(att) => setPreviewAttachment(att)}
          onCreateCalendarEventFromTask={handleCreateCalendarEventFromTask}
        />
      )}

      {isNoteModalOpen && (
        <NoteModal
          note={selectedNote}
          onClose={() => {
            setIsNoteModalOpen(false)
            setSelectedNote(null)
          }}
          onSave={handleSaveNote}
          onDelete={handleDeleteNote}
        />
      )}

      {isGoogleSettingsOpen && (
        <GoogleSettingsModal
          status={googleStatus}
          onClose={() => setIsGoogleSettingsOpen(false)}
          onRefreshStatus={async () => {
            const updated = await api.getStatus()
            setGoogleStatus(updated)
          }}
        />
      )}

      {previewAttachment && (
        <AttachmentModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}

      <UpcomingDeadlinesModal
        isOpen={isDeadlinesOpen}
        onClose={() => setIsDeadlinesOpen(false)}
        events={events}
        tasks={tasks}
        onSelectEvent={(evt) => handleOpenEventModal(evt)}
        onSelectTask={(t) => handleOpenTaskModal(t)}
      />

      {/* Sync Toast Feedback */}
      {syncNotice && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-teal-900/95 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-2xl shadow-2xl border border-teal-500/40 backdrop-blur-md flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}
    </div>
  )
}

export default App
