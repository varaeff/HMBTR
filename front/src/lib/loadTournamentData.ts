import http from '@/api/http'
import { API_ROUTES } from '@shared/routes'

import { useCompetitionStore } from '@/stores/competition'

import type { Competitor, Fighter, Group, BlockData, GroupFighter } from '@/model'

interface GroupResponse {
  id: number
  name: string
  stage: number
}

interface FightResponse {
  id: number
  group_id: number | null
  nomination_id: number
  stage: number
  fight_number: number
  competitor1_id: number
  competitor2_id: number
  competitor1_score: number
  competitor2_score: number
}

interface GroupCompetitorResponse {
  competitor_id: number
}

interface CompetitorWithFighter extends Competitor {
  fighter?: Fighter
}

const hasFighter = (
  value: CompetitorWithFighter['fighter'] | undefined
): value is Fighter => Boolean(value)

// Fetch groups and group members from database
export const loadTournamentData = async (
  tournamentId: number,
  nominationId: number,
  stage: number
) => {
  const competitionStore = useCompetitionStore()

  try {
    // Параллельно загружаем группы и бои.
    const [groupsRes, fightsRes] = await Promise.all([
      http.get<GroupResponse[]>(
        API_ROUTES.GROUPS.BY_TOURNAMENT_AND_NOMINATION(tournamentId, nominationId)
      ),
      http.get<FightResponse[]>(API_ROUTES.FIGHTS.BY_TOURNAMENT(tournamentId))
    ])

    // Используем карту из стора для быстрого доступа к данным бойца по competitor_id
    const competitorMap = new Map<number, CompetitorWithFighter>(
      competitionStore.tournamentCompetitors.map((c) => [
        c.id,
        { ...c, fighter: competitionStore.getNominationFighters.find((f) => f.id === c.fighter_id) }
      ])
    )

    const stageGroups = groupsRes.data
      .filter((g) => g.stage === stage)
      .sort((a, b) => a.name.localeCompare(b.name))
    const stageFights = fightsRes.data.filter(
      (f) => f.nomination_id === nominationId && f.stage === stage
    )

    // Загрузка участников групп (параллельно)
    const groupsData = await Promise.all(
      stageGroups.map(async (gData) => {
        const { data: gComps } = await http.get<GroupCompetitorResponse[]>(
          API_ROUTES.GROUP_COMPETITORS.BY_GROUP(gData.id)
        )
        const fighters: GroupFighter[] = gComps
          .map((gc) => competitorMap.get(gc.competitor_id)?.fighter)
          .filter(hasFighter)
          .map((f) => ({ ...f, wins: 0, diff: 0 }))

        return { letter: gData.name, fighters, id: gData.id }
      })
    )

    const groups: Group[] = groupsData.map(({ letter, fighters }) => ({ letter, fighters }))

    // Сборка блоков
    const fightsBlocks: BlockData[] = []
    for (let i = 0; i < groupsData.length; i += 2) {
      const g1 = groupsData[i]
      const g2 = groupsData[i + 1]
      const blockLetters = g2 ? [g1.letter, g2.letter] : [g1.letter]
      const targetIds = g2 ? [g1.id, g2.id] : [g1.id]

      const blockFights = stageFights
        .filter((f) => f.group_id !== null && targetIds.includes(f.group_id))
        .sort((a, b) => a.fight_number - b.fight_number)
        .map((f) => ({
          id: f.id,
          number: f.fight_number,
          fighter1: competitorMap.get(f.competitor1_id)?.fighter,
          fighter2: competitorMap.get(f.competitor2_id)?.fighter,
          fighter1Score: f.competitor1_score,
          fighter2Score: f.competitor2_score
        }))
        .filter(
          (
            fight
          ): fight is {
            id: number
            number: number
            fighter1: Fighter
            fighter2: Fighter
            fighter1Score: number
            fighter2Score: number
          } => Boolean(fight.fighter1 && fight.fighter2)
        )

      if (blockFights.length > 0) {
        fightsBlocks.push({ letters: blockLetters, fights: blockFights })
      }
    }

    return { groups, fightsBlocks }
  } catch (error) {
    console.error('Error loading tournament data:', error)
    return { groups: [], fightsBlocks: [] }
  }
}
