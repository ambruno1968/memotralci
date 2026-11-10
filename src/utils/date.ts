import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
  isValid,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addDays,
  subDays,
  addMonths,
  subMonths,
} from 'date-fns'
import { it } from 'date-fns/locale'

export function formatDateSafe(
  dateInput: string | Date | undefined,
  formatStr: string = 'dd/MM/yyyy'
): string {
  if (!dateInput) return ''
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput
  if (!isValid(date)) return ''
  return format(date, formatStr, { locale: it })
}

export function formatTimeSafe(dateInput: string | Date | undefined): string {
  if (!dateInput) return ''
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput
  if (!isValid(date)) return ''
  return format(date, 'HH:mm', { locale: it })
}

export function formatRelativeDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return ''
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput
  if (!isValid(date)) return ''

  if (isToday(date)) return 'Oggi'
  if (isTomorrow(date)) return 'Domani'
  if (isYesterday(date)) return 'Ieri'

  return format(date, 'd MMMM', { locale: it })
}

export {
  it,
  format,
  isToday,
  isTomorrow,
  isYesterday,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addDays,
  subDays,
  addMonths,
  subMonths,
}

