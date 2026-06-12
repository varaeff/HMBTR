import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import http from '@/api/http'
import { useDisciplinaryCardsStore } from './disciplinaryCards'

vi.mock('@/api/http', () => ({
  default: {
    delete: vi.fn(),
    get: vi.fn()
  }
}))

describe('disciplinaryCards store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('leaves card-list refresh to the page after deletion', async () => {
    const store = useDisciplinaryCardsStore()
    const loadTournamentCards = vi.spyOn(store, 'loadTournamentCards')
    vi.mocked(http.delete).mockResolvedValue({ data: undefined })
    vi.mocked(http.get).mockResolvedValue({ data: [] })

    await store.deleteCard(7)

    expect(http.delete).toHaveBeenCalledOnce()
    expect(loadTournamentCards).not.toHaveBeenCalled()
  })
})
