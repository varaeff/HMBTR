import http from '@/api/http'
import { API_ROUTES } from '@shared/routes'

import { useCompetitionStore } from '@/stores/competition'

import type { Group, BlockData, GroupFighter } from '@/model'

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
      http.get(API_ROUTES.GROUPS.BY_TOURNAMENT_AND_NOMINATION(tournamentId, nominationId)),
      http.get(API_ROUTES.FIGHTS.BY_TOURNAMENT(tournamentId))
    ])

    // Используем карту из стора для быстрого доступа к данным бойца по competitor_id
    const competitorMap = new Map<number, any>(
      competitionStore.tournamentCompetitors.map((c) => [
        c.id,
        { ...c, fighter: competitionStore.getNominationFighters.find((f) => f.id === c.fighter_id) }
      ])
    )

    const stageGroups = groupsRes.data
      .filter((g: any) => g.stage === stage)
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
    const stageFights = fightsRes.data.filter(
      (f: any) => f.nomination_id === nominationId && f.stage === stage
    )

    // Загрузка участников групп (параллельно)
    const groupsData = await Promise.all(
      stageGroups.map(async (gData: any) => {
        const { data: gComps } = await http.get(API_ROUTES.GROUP_COMPETITORS.BY_GROUP(gData.id))
        const fighters: GroupFighter[] = gComps
          .map((gc: any) => competitorMap.get(gc.competitor_id)?.fighter)
          .filter(Boolean)
          .map((f: any) => ({ ...f, wins: 0, diff: 0 }))

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
        .filter((f: any) => targetIds.includes(f.group_id))
        .sort((a: any, b: any) => a.fight_number - b.fight_number)
        .map((f: any) => ({
          id: f.id,
          number: f.fight_number,
          fighter1: competitorMap.get(f.competitor1_id)?.fighter,
          fighter2: competitorMap.get(f.competitor2_id)?.fighter,
          fighter1Score: f.competitor1_score,
          fighter2Score: f.competitor2_score
        }))

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
