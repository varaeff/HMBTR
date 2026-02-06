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
  return new Date(date.year, date.month - 1, date.day + 1)
}

export const parseInput = (checkString: string): string => {
  const regexp = /^[a-zA-Zа-яА-ЯёЁ ]*$/
  if (checkString.length && !checkString[checkString.length - 1].match(regexp)) {
    return checkString.slice(0, -1)
  }
  return checkString
}
