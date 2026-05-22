import http from '@/api/http'
import { API_ROUTES } from '@shared/routes'

import { useCompetitionStore } from '@/stores/competition'

import type { Group, BlockData } from '@/model'

interface TournamentNominationResponse {
  id: number
  nomination_id: number
}

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
    const { data: tournamentsNominations } = await http.get<TournamentNominationResponse[]>(
      `${API_ROUTES.TOURNAMENTS.ROOT}/${API_ROUTES.TOURNAMENTS.NOMINATION}/${tournamentId}`
    )
    const targetNomination = tournamentsNominations.find(
      (tn) => tn.nomination_id === nominationId
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
    const participantRequests: Array<Promise<unknown>> = []
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
