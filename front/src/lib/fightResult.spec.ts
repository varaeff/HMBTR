import { describe, expect, it } from 'vitest'
import type { CompetitionBlock, FightData, PendingTie } from '@/model'
import {
  areFightResultsReady,
  buildSubmittedFightResult,
  canShowGroupFightActions,
  getIncompleteFightNumbers,
  getSubmittedRoundScores
} from './fightResult'

const fighter = (id: number) => ({
  id,
  name: `Name ${id}`,
  surname: `Surname ${id}`,
  country: '',
  city: ''
})

const roundWinFight = (overrides: Partial<FightData> = {}): FightData => ({
  id: 1,
  number: 1,
  fighter1: fighter(1),
  fighter2: fighter(2),
  fighter1Score: 10,
  fighter2Score: 5,
  roundScores: [
    { competitor1Score: 5, competitor2Score: 0 },
    { competitor1Score: 5, competitor2Score: 0 },
    { competitor1Score: 0, competitor2Score: 5 }
  ],
  rounds: 3,
  roundWin: true,
  isResultValid: true,
  isFinished: false,
  ...overrides
})

describe('areFightResultsReady', () => {
  it('rejects a round-win result that has unequal totals but no winner by rounds', () => {
    const fight = roundWinFight({
      fighter1Score: 10,
      fighter2Score: 5,
      isResultValid: false
    })

    expect(areFightResultsReady([fight])).toBe(false)
  })

  it('accepts a valid round-win result even when aggregate totals are equal', () => {
    const fight = roundWinFight({
      fighter1Score: 5,
      fighter2Score: 5,
      isResultValid: true
    })

    expect(areFightResultsReady([fight])).toBe(true)
  })

  it('reports incomplete fight numbers for block-specific result recording guards', () => {
    expect(
      getIncompleteFightNumbers([
        roundWinFight({ number: 1, isResultValid: true }),
        roundWinFight({ number: 2, isResultValid: false }),
        roundWinFight({ number: 3, isResultValid: false })
      ])
    ).toEqual([2, 3])
  })
})

describe('getSubmittedRoundScores', () => {
  it('omits stale extra rounds when base rounds already have a winner', () => {
    const fight = roundWinFight({
      roundScores: [
        { competitor1Score: 1, competitor2Score: 0 },
        { competitor1Score: 1, competitor2Score: 0 },
        { competitor1Score: 0, competitor2Score: 1 },
        { competitor1Score: 0, competitor2Score: 1 }
      ]
    })

    expect(getSubmittedRoundScores(fight)).toHaveLength(3)
  })

  it('keeps tied extras through the first decisive extra round', () => {
    const fight = roundWinFight({
      rounds: 1,
      roundWin: false,
      roundScores: [
        { competitor1Score: 2, competitor2Score: 2 },
        { competitor1Score: 0, competitor2Score: 0 },
        { competitor1Score: 1, competitor2Score: 0 },
        { competitor1Score: 0, competitor2Score: 1 }
      ]
    })

    expect(getSubmittedRoundScores(fight)).toEqual(fight.roundScores.slice(0, 3))
  })

  it('keeps extra rounds required by warning-adjusted scores', () => {
    const fight = roundWinFight({
      competitor1Id: 101,
      competitor2Id: 202,
      rounds: 1,
      roundWin: false,
      roundScores: [
        { competitor1Score: 3, competitor2Score: 0 },
        { competitor1Score: 1, competitor2Score: 0 }
      ],
      warnings: [{ competitorId: 101, round: 1, reason: 'Holding' }]
    })

    expect(getSubmittedRoundScores(fight)).toEqual(fight.roundScores)
  })
})

describe('buildSubmittedFightResult', () => {
  it('serializes one-round fights with round_scores instead of aggregate score fields', () => {
    const fight = roundWinFight({
      rounds: 1,
      roundWin: false,
      roundScores: [{ competitor1Score: 5, competitor2Score: 3 }],
      warnings: [{ competitorId: 101, round: 1, reason: 'Holding' }]
    })

    const payload = buildSubmittedFightResult(fight)

    expect(payload).toEqual({
      fight_id: fight.id,
      round_scores: [{ competitor1_score: 5, competitor2_score: 3, duration_seconds: 0 }],
      warnings: [{ competitor_id: 101, round: 1, reason: 'Holding' }]
    })
    expect('competitor1_score' in payload).toBe(false)
    expect('competitor2_score' in payload).toBe(false)
  })

  it('serializes extra rounds required after warning bonuses', () => {
    const fight = roundWinFight({
      competitor1Id: 101,
      competitor2Id: 202,
      rounds: 1,
      roundWin: false,
      mainRoundTime: 90,
      additionalRoundTime: 30,
      roundScores: [
        { competitor1Score: 3, competitor2Score: 0 },
        { competitor1Score: 1, competitor2Score: 0, durationSeconds: 45 }
      ],
      warnings: [{ competitorId: 101, round: 1, reason: 'Holding' }]
    })

    const payload = buildSubmittedFightResult(fight)

    expect(payload.round_scores).toEqual([
      { competitor1_score: 3, competitor2_score: 0, duration_seconds: 90 },
      { competitor1_score: 1, competitor2_score: 0, duration_seconds: 45 }
    ])
    expect(payload.warnings).toEqual([{ competitor_id: 101, round: 1, reason: 'Holding' }])
  })
})

describe('canShowGroupFightActions', () => {
  const groupBlock: CompetitionBlock = {
    id: 10,
    type: 'GROUP',
    stage: 1,
    status: 'ACTIVE',
    lifecycleState: 'FIGHTS_EDITABLE',
    groups: [],
    fights: [],
    fightsBlocks: [],
    bracketSlots: [],
    roundStates: []
  }

  it('hides record and group-unfix actions while a group placement tie is pending', () => {
    const pendingTie: PendingTie = {
      blockId: groupBlock.id,
      groupId: 5,
      competitorIds: [1, 2],
      scope: 'GROUP'
    }

    expect(canShowGroupFightActions(groupBlock, pendingTie)).toBe(false)
  })

  it('keeps group actions available for an Olympic-third tie', () => {
    const pendingTie: PendingTie = {
      blockId: groupBlock.id,
      groupId: null,
      competitorIds: [1, 2],
      scope: 'OLYMPIC_THIRD'
    }

    expect(canShowGroupFightActions(groupBlock, pendingTie)).toBe(true)
  })
})
