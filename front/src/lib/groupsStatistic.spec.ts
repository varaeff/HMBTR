import { describe, expect, it } from 'vitest'
import { updateGroupsStatistics } from './groupsStatistic'
import type { BlockData, FightData, Group, GroupFighter } from '@/model'

const fighter = (id: number, competitorId: number): GroupFighter => ({
  id,
  competitorId,
  name: `Name ${id}`,
  surname: `Surname ${id}`,
  birthday: null,
  country: '',
  city: '',
  wins: 0,
  diff: 0
})

const fight = (
  fighter1: GroupFighter,
  fighter2: GroupFighter,
  fighter1Score: number,
  fighter2Score: number
): FightData => ({
  id: fighter1.id * 10 + fighter2.id,
  number: fighter1.id * 10 + fighter2.id,
  fighter1,
  fighter2,
  competitor1Id: fighter1.competitorId,
  competitor2Id: fighter2.competitorId,
  fighter1Score,
  fighter2Score,
  roundScores: [],
  rounds: 1,
  roundWin: false,
  isResultValid: fighter1Score !== fighter2Score,
  isFinished: true
})

describe('updateGroupsStatistics', () => {
  it('applies resolved tie order only after wins and diff', () => {
    const f1 = fighter(1, 101)
    const f2 = fighter(2, 102)
    const f3 = fighter(3, 103)
    const f4 = fighter(4, 104)
    const group: Group = {
      id: 1,
      letter: 'A',
      fighters: [f1, f2, f3, f4],
      placements: [
        { competitorId: 103, place: 1 },
        { competitorId: 102, place: 2 }
      ]
    }
    const blocks: BlockData[] = [
      {
        letters: ['A'],
        fights: [
          fight(f1, f2, 3, 0),
          fight(f1, f3, 3, 0),
          fight(f1, f4, 2, 0),
          fight(f2, f3, 3, 0),
          fight(f2, f4, 0, 1),
          fight(f3, f4, 5, 0)
        ]
      }
    ]

    updateGroupsStatistics([group], blocks)

    expect(group.fighters.map((item) => item.competitorId)).toEqual([101, 103, 102, 104])
  })

  it('uses winner id for wins while keeping aggregate scores for difference', () => {
    const f1 = fighter(1, 101)
    const f2 = fighter(2, 102)
    const group: Group = { id: 1, letter: 'A', fighters: [f1, f2] }
    const roundWinFight = {
      ...fight(f1, f2, 5, 10),
      winnerId: 101
    }

    updateGroupsStatistics([group], [{ letters: ['A'], fights: [roundWinFight] }])

    expect(f1.wins).toBe(1)
    expect(f1.diff).toBe(-5)
    expect(f2.wins).toBe(0)
    expect(f2.diff).toBe(5)
  })
})
