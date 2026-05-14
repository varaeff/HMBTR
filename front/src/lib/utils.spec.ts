import { describe, expect, it } from 'vitest'
import { tData } from './utils'

describe('tData', () => {
  it('transliterates Cyrillic data only for English', () => {
    expect(tData('Москва', 'en')).toBe('Moskva')
    expect(tData('Москва', 'ru')).toBe('Москва')
  })
})
