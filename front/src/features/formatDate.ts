import type { CalendarDate } from '@internationalized/date'

export const toISODate = (date: CalendarDate): string => {
  const year = date.year
  const month = date.month
  const day = date.day

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${year}-${pad(month)}-${pad(day)}`
}

export const toDateFormat = (date: CalendarDate): Date => {
  return new Date(date.year, date.month - 1, date.day + 1)
}
