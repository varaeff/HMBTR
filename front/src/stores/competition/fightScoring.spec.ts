import { describe, expect, it } from 'vitest'
import type { FightData } from '@/model/competition'
import type { Fighter } from '@/model/fighter'
import { applyFightScoreDraft, evaluateFightWithWarnings } from './fightScoring'

const fighter = (id: number): Fighter => ({
  id,
  name: `Name ${id}`,
  surname: `Surname ${id}`,
  birthday: null,
  country: '',
  city: ''
})

const fight = (overrides: Partial<FightData> = {}): FightData => ({
  id: 1,
  number: 1,
  fighter1: fighter(1),
  fighter2: fighter(2),
  competitor1Id: 101,
  competitor2Id: 202,
  fighter1Score: 0,
  fighter2Score: 0,
  fighter1EffectiveScore: 0,
  fighter2EffectiveScore: 0,
  roundScores: [{ competitor1Score: 0, competitor2Score: 3 }],
  rounds: 1,
  roundWin: false,
  isResultValid: true,
  isFinished: false,
  ...overrides
})

describe('evaluateFightWithWarnings', () => {
  it('uses warning-adjusted scores for editable non-forfeit fights', () => {
    const result = evaluateFightWithWarnings(
      { rounds: 1, roundWin: false },
      {
        competitor1Id: 101,
        competitor2Id: 202,
        fighter1Score: 0,
        fighter2Score: 3,
        roundScores: [{ competitor1Score: 0, competitor2Score: 3 }],
        warnings: [{ competitorId: 202, round: 1, reason: 'Holding' }]
      }
    )

    expect(result.fighter1EffectiveScore).toBe(3)
    expect(result.fighter2EffectiveScore).toBe(3)
    expect(result.evaluation.isValidResult).toBe(false)
  })

  it('keeps persisted forfeit scores authoritative', () => {
    const result = evaluateFightWithWarnings(
      { rounds: 1, roundWin: false },
      {
        competitor1Id: 101,
        competitor2Id: 202,
        fighter1Score: 0,
        fighter2Score: 10,
        roundScores: [{ competitor1Score: 0, competitor2Score: 10 }],
        warnings: [{ competitorId: 202, round: 1, reason: 'Holding' }],
        isTechnicalForfeit: true
      }
    )

    expect(result.fighter1EffectiveScore).toBe(0)
    expect(result.fighter2EffectiveScore).toBe(10)
    expect(result.evaluation.isValidResult).toBe(true)
  })
})

describe('applyFightScoreDraft', () => {
  it('mutates fight draft fields and derived result state together', () => {
    const targetFight = fight()

    applyFightScoreDraft(targetFight, {
      roundScores: [{ competitor1Score: 2, competitor2Score: 0 }],
      warnings: [{ competitorId: 101, round: 1, reason: 'Holding' }]
    })

    expect(targetFight.roundScores).toEqual([{ competitor1Score: 2, competitor2Score: 0 }])
    expect(targetFight.warnings).toEqual([{ competitorId: 101, round: 1, reason: 'Holding' }])
    expect(targetFight.fighter1Score).toBe(2)
    expect(targetFight.fighter2Score).toBe(3)
    expect(targetFight.fighter1EffectiveScore).toBe(2)
    expect(targetFight.fighter2EffectiveScore).toBe(3)
    expect(targetFight.winnerId).toBe(202)
    expect(targetFight.isResultValid).toBe(true)
  })
})
