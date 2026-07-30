import { describe, expect, it } from 'vitest'
import {
  availableIssueWarningRounds,
  bonusForScore,
  createFightWarningMarkers
} from './useFightWarningPresentation'
import type { FightWarning } from '@shared/fightScoring'

const translate = (key: string, options?: Record<string, string | number>) => {
  if (key === 'fightWarningReasonTooltip') return `Warning: ${options?.reason}`
  if (key === 'fightWarningRoundReasonTooltip') {
    return `Warning (round ${options?.round}): ${options?.reason}`
  }
  return key
}

describe('fight warning presentation', () => {
  it('builds single-round marker titles without round labels', () => {
    const warnings: FightWarning[] = [{ competitorId: 101, round: 1, reason: 'Holding' }]

    expect(
      createFightWarningMarkers({
        fighter: 1,
        rounds: 1,
        warnings,
        translate,
        competitor1Id: 101,
        competitor2Id: 202
      })
    ).toEqual([
      {
        id: '1-0',
        warningIndex: 0,
        title: 'Warning: Holding'
      }
    ])
  })

  it('builds multi-round marker titles with round labels', () => {
    const warnings: FightWarning[] = [{ competitorId: 202, round: 3, reason: 'Late strike' }]

    expect(
      createFightWarningMarkers({
        fighter: 2,
        rounds: 3,
        warnings,
        translate,
        competitor1Id: 101,
        competitor2Id: 202
      })
    ).toEqual([
      {
        id: '2-3-0',
        warningIndex: 0,
        round: 3,
        title: 'Warning (round 3): Late strike'
      }
    ])
  })

  it('keeps original warning indexes for exact marker deletion', () => {
    const warnings: FightWarning[] = [
      { competitorId: 101, round: 1, reason: 'First warning' },
      { competitorId: 202, round: 1, reason: 'Second warning' },
      { competitorId: 101, round: 1, reason: 'Third warning' }
    ]

    const markers = createFightWarningMarkers({
      fighter: 1,
      rounds: 1,
      warnings,
      translate,
      competitor1Id: 101,
      competitor2Id: 202
    })

    expect(markers.map((marker) => marker.warningIndex)).toEqual([0, 2])
  })

  it('derives issue rounds and opponent warning bonuses', () => {
    const warnings: FightWarning[] = [
      { competitorId: 202, round: 1, reason: 'First warning' },
      { competitorId: 202, round: 1, reason: 'Second warning' },
      { competitorId: 101, round: 2, reason: 'Third warning' }
    ]

    expect(
      availableIssueWarningRounds(3, [
        { competitor1Score: 0, competitor2Score: 0 },
        { competitor1Score: 0, competitor2Score: 0 }
      ])
    ).toEqual([1, 2])
    expect(
      availableIssueWarningRounds(1, [
        { competitor1Score: 3, competitor2Score: 3 },
        { competitor1Score: 1, competitor2Score: 1 },
        { competitor1Score: 0, competitor2Score: 0 }
      ])
    ).toEqual([1, 2, 3])
    expect(bonusForScore(1, 1, warnings, { competitor1Id: 101, competitor2Id: 202 })).toBe(6)
    expect(bonusForScore(2, 2, warnings, { competitor1Id: 101, competitor2Id: 202 })).toBe(3)
  })
})
