import { describe, expect, it } from 'vitest'
import type { CompetitionBlock, FightData, PendingTie } from '@/model'
import {
  areFightResultsReady,
  canShowGroupFightActions,
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
})

describe('getSubmittedRoundScores', () => {
  it('omits a stale fourth round when the first three rounds already have a winner', () => {
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

  it('keeps a required fourth round', () => {
    const fight = roundWinFight({
      roundScores: [
        { competitor1Score: 1, competitor2Score: 0 },
        { competitor1Score: 0, competitor2Score: 1 },
        { competitor1Score: 0, competitor2Score: 0 },
        { competitor1Score: 1, competitor2Score: 0 }
      ]
    })

    expect(getSubmittedRoundScores(fight)).toHaveLength(4)
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
