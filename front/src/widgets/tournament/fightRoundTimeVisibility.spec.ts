import { describe, expect, it } from 'vitest'
import type { FightData, Fighter } from '@/model'
import {
  hasEditableRoundTimeInput,
  hasEditableRoundTimeInputs
} from './fightRoundTimeVisibility'

const fighter = (id: number): Fighter => ({
  id,
  name: `Name ${id}`,
  surname: `Surname ${id}`,
  birthday: null,
  country: 'Georgia',
  city: 'Tbilisi'
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
  roundScores: [{ competitor1Score: 0, competitor2Score: 0 }],
  rounds: 1,
  roundWin: false,
  isResultValid: false,
  isFinished: false,
  ...overrides
})

describe('fightRoundTimeVisibility', () => {
  it('allows the round-time toggle when at least one fight still has editable score inputs', () => {
    expect(hasEditableRoundTimeInputs([fight({ isFinished: true }), fight()])).toBe(true)
  })

  it('hides the round-time toggle when every fight is already finished', () => {
    expect(hasEditableRoundTimeInputs([fight({ isFinished: true })])).toBe(false)
  })

  it('hides the round-time toggle for red-card forfeits', () => {
    expect(hasEditableRoundTimeInput(fight({ forfeitCardId: 5 }))).toBe(false)
  })

  it('hides the round-time toggle for withdrawal forfeits', () => {
    expect(hasEditableRoundTimeInput(fight({ forfeitWithdrawalId: 9 }))).toBe(false)
  })

  it('hides the round-time toggle for warning technical defeats', () => {
    expect(
      hasEditableRoundTimeInput(
        fight({
          warnings: [
            { competitorId: 101, round: 1, reason: 'First' },
            { competitorId: 101, round: 1, reason: 'Second' },
            { competitorId: 101, round: 1, reason: 'Third' }
          ]
        })
      )
    ).toBe(false)
  })
})
