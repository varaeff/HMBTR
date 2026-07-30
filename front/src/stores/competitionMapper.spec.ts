import { describe, expect, it } from 'vitest'
import type { Fighter } from '@/model'
import { mapCompetitionState, type RawCompetitionState } from './competitionMapper'

const resolvedFighter: Fighter = {
  id: 10,
  name: 'Resolved',
  surname: 'Fighter',
  birthday: null,
  country: 'Georgia',
  city: 'Tbilisi'
}

const rawFight = {
  id: 100,
  fight_number: 1,
  competitor1: {
    id: 501,
    fighter_id: 10,
    fighter: {
      id: 10,
      name: 'Raw',
      surname: 'Ignored'
    }
  },
  competitor2: {
    id: 502,
    fighter_id: 20,
    fighter: {
      id: 20,
      name: 'Fallback',
      surname: 'Fighter',
      city_id: 7,
      club_id: 3
    }
  },
  competitor1_id: 501,
  competitor2_id: 502,
  competitor1_score: 5,
  competitor2_score: 3,
  competitor1_round1_score: 5,
  competitor2_round1_score: 3,
  competitor1_round2_score: 0,
  competitor2_round2_score: 0,
  competitor1_round3_score: 0,
  competitor2_round3_score: 0,
  competitor1_round4_score: 0,
  competitor2_round4_score: 0
}

const competitionState = (): RawCompetitionState => ({
  tournamentNomination: {
    is_open: false,
    nomination: {
      rounds: 1,
      round_win: false
    }
  },
  activeBlockId: 1,
  blocks: [
    {
      id: 1,
      type: 'GROUP',
      stage: 1,
      status: 'ACTIVE',
      lifecycle_state: 'FIGHTS_EDITABLE',
      groups: [
        {
          id: 11,
          name: 'A',
          fighters: [
            { competitor: rawFight.competitor1 },
            { competitor: rawFight.competitor2 }
          ]
        }
      ],
      fights: [rawFight]
    }
  ]
})

describe('mapCompetitionState', () => {
  it('uses the injected fighter resolver before falling back to raw fighter data', () => {
    const mapped = mapCompetitionState(competitionState(), {}, {
      resolveFighterById: (fighterId) => (fighterId === resolvedFighter.id ? resolvedFighter : undefined)
    })

    const [firstFighter, secondFighter] = mapped.blocks[0].groups[0].fighters

    expect(firstFighter.name).toBe('Resolved')
    expect(firstFighter.country).toBe('Georgia')
    expect(firstFighter.competitorId).toBe(501)
    expect(secondFighter.name).toBe('Fallback')
    expect(secondFighter.city).toBe('7')
    expect(secondFighter.club).toBe('3')
  })
})
