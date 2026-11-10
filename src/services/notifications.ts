import type { AppCalendarEvent } from '../types/event.ts'
import type { AppTaskItem } from '../types/task.ts'

export const notificationService = {
  isSupported(): boolean {
    return 'Notification' in window
  },

  getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied'
    return Notification.permission
  },

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false
    try {
      const perm = await Notification.requestPermission()
      return perm === 'granted'
    } catch {
      return false
    }
  },

  sendNotification(title: string, options?: NotificationOptions) {
    if (!this.isSupported() || Notification.permission !== 'granted') return
    try {
      new Notification(title, {
        icon: '/icon-192.png',
        badge: '/favicon.svg',
        ...options,
      })
    } catch (e) {
      console.warn('Invio notifica fallito:', e)
    }
  },

  checkReminders(events: AppCalendarEvent[], tasks: AppTaskItem[]) {
    if (!this.isSupported() || Notification.permission !== 'granted') return

    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)

    // Check events happening within next 30 minutes
    for (const evt of events) {
      if (evt.allDay) continue
      const evtStart = new Date(evt.start)
      const diffMs = evtStart.getTime() - now.getTime()
      const diffMins = Math.round(diffMs / 60000)

      // Notify if starting in 15-30 minutes and not notified yet
      if (diffMins > 0 && diffMins <= 30) {
        const notifKey = `notified_evt_${evt.id}_${todayStr}`
        if (!sessionStorage.getItem(notifKey)) {
          this.sendNotification(`Promemoria: ${evt.title}`, {
            body: `Inizia tra ${diffMins} minuti${evt.location ? ` presso ${evt.location}` : ''}`,
            tag: evt.id,
          })
          sessionStorage.setItem(notifKey, 'true')
        }
      }
    }

    // Check tasks due today
    for (const task of tasks) {
      if (!task.completed && task.dueDate === todayStr) {
        const notifKey = `notified_task_${task.id}_${todayStr}`
        if (!sessionStorage.getItem(notifKey)) {
          this.sendNotification(`Attività in scadenza oggi: ${task.title}`, {
            body: `Priorità: ${task.priority.toUpperCase()}`,
            tag: task.id,
          })
          sessionStorage.setItem(notifKey, 'true')
        }
      }
    }
  },
}

