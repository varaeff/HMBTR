import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { transliterate } from 'transliteration'
import i18n from 'i18next'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const parseInput = (checkString: string, inputType: string): string => {
  if (inputType === 'email') {
    return checkString.replace(/[^a-zA-Z0-9@._+-]/g, '')
  } else if (inputType === 'text') {
    return checkString.replace(/[^a-zA-Zа-яА-ЯёЁ ]/g, '')
  }
  return checkString
}

export const tData = (text: string): string => {
  if (!text) return ''

  const currentLanguage = i18n.language || 'ru'
  const hasCyrillic = /[а-яё]/i.test(text)

  if (currentLanguage === 'en' && hasCyrillic) {
    return transliterate(text)
  }

  return text
}
