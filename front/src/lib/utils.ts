import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { CalendarDate } from '@internationalized/date'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const toISODate = (date: CalendarDate): string => {
  const year = date.year
  const month = date.month
  const day = date.day

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${year}-${pad(month)}-${pad(day)}`
}

export const toDateFormat = (date: CalendarDate): Date => {
  return new Date(Date.UTC(date.year, date.month - 1, date.day))
}

export const parseInput = (checkString: string): string => {
  return checkString.replace(/[^a-zA-Zа-яА-ЯёЁ]/g, '')
}

export const dateToString = (date: Date | null | undefined): string => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
