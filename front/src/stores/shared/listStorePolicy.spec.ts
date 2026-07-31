import { describe, expect, it } from 'vitest'
import {
  filterBySearch,
  getNextListId,
  hasLoadedRemoteList,
  mergeMissingById,
  replaceById,
  sortByDateDesc,
  upsertById,
  withFallback
} from './listStorePolicy'

interface TestItem {
  id: number
  name: string
  city?: string
  createdAt?: Date
}

describe('listStorePolicy', () => {
  it('filters by selected text fields case-insensitively', () => {
    const items: TestItem[] = [
      { id: 1, name: 'Ivan', city: 'Tbilisi' },
      { id: 2, name: 'Sergey', city: 'Batumi' }
    ]

    expect(filterBySearch(items, 'TBIL', [(item) => item.name, (item) => item.city])).toEqual([
      items[0]
    ])
  })

  it('checks remote count through an optional local-item predicate', () => {
    const items: TestItem[] = [
      { id: 0, name: 'Fallback' },
      { id: 1, name: 'Ivan' },
      { id: 2, name: 'Sergey' }
    ]

    expect(hasLoadedRemoteList(items, 2, (item) => item.id !== 0)).toBe(true)
  })

  it('merges missing ids and preserves existing items', () => {
    const target: TestItem[] = [{ id: 1, name: 'Existing' }]

    mergeMissingById(target, [
      { id: 1, name: 'Incoming existing' },
      { id: 2, name: 'Incoming new' }
    ])

    expect(target).toEqual([
      { id: 1, name: 'Existing' },
      { id: 2, name: 'Incoming new' }
    ])
  })

  it('replaces and upserts by id', () => {
    const target: TestItem[] = [{ id: 1, name: 'Old' }]

    expect(replaceById(target, { id: 1, name: 'Updated' })).toBe(true)
    upsertById(target, { id: 2, name: 'New' })

    expect(target).toEqual([
      { id: 1, name: 'Updated' },
      { id: 2, name: 'New' }
    ])
  })

  it('calculates next id, sorts dates descending, and returns fallback for empty lists', () => {
    const first = { id: 1, name: 'First', createdAt: new Date('2026-01-01') }
    const second = { id: 3, name: 'Second', createdAt: new Date('2026-02-01') }

    expect(getNextListId([first, second])).toBe(4)
    expect(sortByDateDesc([first, second], (item) => item.createdAt)).toEqual([second, first])
    expect(withFallback([], first)).toEqual([first])
  })
})
