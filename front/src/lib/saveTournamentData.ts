import http from '@/api/http'
import { API_ROUTES } from '@shared/routes'

import { useCompetitionStore } from '@/stores/competition'

import type { Group, BlockData, GroupFighter } from '@/model'

interface SaveTournamentDataParams {
  tournamentId: number
  nominationId: number
  currentStage: number
  groups: Group[]
  fightsBlocks: BlockData[]
}

const getFighterGroupMap = (groups: Group[]): Map<number, string> => {
  const map = new Map<number, string>()
  groups.forEach((group) => {
    group.fighters.forEach((f) => map.set(f.id, group.letter))
  })
  return map
}

export const saveTournamentData = async ({
  tournamentId,
  nominationId,
  currentStage,
  groups,
  fightsBlocks
}: SaveTournamentDataParams) => {
  const competitionStore = useCompetitionStore()

  try {
    // 1. Подготовка данных
    const { data: tournamentsNominations } = await http.get(
      `${API_ROUTES.TOURNAMENTS.ROOT}/${API_ROUTES.TOURNAMENTS.NOMINATION}/${tournamentId}`
    )
    const targetNomination = tournamentsNominations.find(
      (tn: any) => tn.nomination_id === nominationId
    )
    if (!targetNomination) throw new Error('Tournament nomination not found')

    const newStage = currentStage + 1
    const compMap = new Map<number, number>(
      competitionStore.tournamentCompetitors.map((c) => [c.fighter_id, c.id])
    )
    const fighterToGroupMap = getFighterGroupMap(groups)

    // 2. Обновление стадии в БД
    await http.patch(`${API_ROUTES.TOURNAMENTS.ROOT}/${API_ROUTES.TOURNAMENTS.NOMINATION}/stage`, {
      nomination_id: targetNomination.id,
      stage: newStage
    })

    // 3. Сохранение групп (параллельно) и создание Map ID групп
    const groupsMap = new Map<string, number>()
    const groupCreationResults = await Promise.all(
      groups.map((group) =>
        http
          .post(API_ROUTES.GROUPS.ROOT, {
            tournament_id: tournamentId,
            nomination_id: nominationId,
            name: group.letter,
            stage: newStage
          })
          .then((res) => ({ letter: group.letter, id: res.data.id, fighters: group.fighters }))
      )
    )

    // 4. Сохранение участников групп (всех сразу)
    const participantRequests: any[] = []
    for (const g of groupCreationResults) {
      groupsMap.set(g.letter, g.id)
      g.fighters.forEach((fighter) => {
        const competitorId = compMap.get(fighter.id)
        if (competitorId) {
          participantRequests.push(
            http.post(API_ROUTES.GROUP_COMPETITORS.ROOT, {
              group_id: g.id,
              competitor_id: competitorId
            })
          )
        }
      })
    }
    await Promise.all(participantRequests)

    // 5. Сохранение боев (всех сразу)
    const fightRequests = fightsBlocks.flatMap((block) =>
      block.fights.map((fight) => {
        const c1 = compMap.get(fight.fighter1.id)
        const c2 = compMap.get(fight.fighter2.id)
        const gLetter = fighterToGroupMap.get(fight.fighter1.id)

        return http.post(API_ROUTES.FIGHTS.ROOT, {
          tournament_id: tournamentId,
          nomination_id: nominationId,
          group_id: gLetter ? groupsMap.get(gLetter) : null,
          competitor1_id: c1,
          competitor2_id: c2,
          stage: newStage,
          fight_number: fight.number
        })
      })
    )
    await Promise.all(fightRequests)

    //Обновляем стор после успешного сохранения в БД
    competitionStore.updateStageData(groups, fightsBlocks)

    return { success: true, newStage }
  } catch (error) {
    console.error('Error saving tournament data:', error)
    throw error
  }
}

// Fetch groups and group members from database
export const loadGroupsAndFights = async (
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
