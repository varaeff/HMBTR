import { beforeEach, describe, expect, it } from 'vitest'
import { readFightResultDrafts, writeFightResultDrafts } from './resultDrafts'

const draftsKey = (tournamentId: number, nominationId: number) =>
  `HMBTR-competition-result-drafts-${tournamentId}-${nominationId}`

describe('competition result drafts', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('persists and reads fight result drafts by tournament and nomination', () => {
    writeFightResultDrafts(1, 2, {
      '10': {
        blockId: 3,
        roundScores: [{ competitor1Score: 5, competitor2Score: 4 }],
        warnings: [{ competitorId: 100, round: 1, reason: 'Holding' }]
      }
    })

    expect(readFightResultDrafts(1, 2)).toEqual({
      '10': {
        blockId: 3,
        roundScores: [{ competitor1Score: 5, competitor2Score: 4 }],
        warnings: [{ competitorId: 100, round: 1, reason: 'Holding' }]
      }
    })
  })

  it('removes storage when no drafts remain', () => {
    writeFightResultDrafts(1, 2, {
      '10': { blockId: 3 }
    })
    writeFightResultDrafts(1, 2, {})

    expect(localStorage.getItem(draftsKey(1, 2))).toBeNull()
  })

  it('falls back to an empty draft set after malformed JSON', () => {
    localStorage.setItem(draftsKey(1, 2), '{bad')

    expect(readFightResultDrafts(1, 2)).toEqual({})
  })
})
