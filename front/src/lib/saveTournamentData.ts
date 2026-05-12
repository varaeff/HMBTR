import http from '@/api/http'
import { API_ROUTES } from '@shared/routes'
import type { Group, BlockData, GroupFighter } from '@/model'
import { useFightersListStore } from '@/stores/fightersList'

interface SaveTournamentDataParams {
  tournamentId: number
  nominationId: number
  currentStage: number
  groups: Group[]
  fightsBlocks: BlockData[]
}

export const saveTournamentData = async ({
  tournamentId,
  nominationId,
  currentStage,
  groups,
  fightsBlocks
}: SaveTournamentDataParams) => {
  try {
    // Get tournament_nominations to find its id
    const nominationsUrl = `${API_ROUTES.TOURNAMENTS.ROOT}/${API_ROUTES.TOURNAMENTS.NOMINATION}/${tournamentId}`
    const { data: tournamentsNominations } = await http.get(nominationsUrl)

    const targetNomination = tournamentsNominations.find(
      (tn: any) => tn.nomination_id === nominationId
    )

    if (!targetNomination) {
      throw new Error('Tournament nomination not found')
    }

    const newStage = currentStage + 1

    // 1. Update tournament_nominations stage
    await http.patch(`${API_ROUTES.TOURNAMENTS.ROOT}/${API_ROUTES.TOURNAMENTS.NOMINATION}/stage`, {
      nomination_id: targetNomination.id,
      stage: newStage
    })

    // 2. Save groups and collect their IDs
    const groupsMap = new Map<string, number>()

    for (const group of groups) {
      const { data: createdGroup } = await http.post(API_ROUTES.GROUPS.ROOT, {
        tournament_id: tournamentId,
        nomination_id: nominationId,
        name: group.letter,
        stage: newStage
      })
      groupsMap.set(group.letter, createdGroup.id)
    }

    // Create a map of fighter ID to group letter for quick lookup
    const fighterToGroupMap = new Map<number, string>()
    for (const group of groups) {
      for (const fighter of group.fighters) {
        fighterToGroupMap.set(fighter.id, group.letter)
      }
    }

    // 3. Save group_competitors
    for (const group of groups) {
      const groupId = groupsMap.get(group.letter)
      if (!groupId) continue

      for (const fighter of group.fighters) {
        const competitorId = await findCompetitorId(fighter.id, tournamentId, nominationId)

        if (competitorId) {
          await http.post(API_ROUTES.GROUP_COMPETITORS.ROOT, {
            group_id: groupId,
            competitor_id: competitorId
          })
        }
      }
    }

    // 4. Save fights
    for (const block of fightsBlocks) {
      for (const fight of block.fights) {
        const competitor1Id = await findCompetitorId(fight.fighter1.id, tournamentId, nominationId)
        const competitor2Id = await findCompetitorId(fight.fighter2.id, tournamentId, nominationId)

        if (!competitor1Id || !competitor2Id) continue

        // Determine group ID based on which group these fighters belong to
        const groupLetter = fighterToGroupMap.get(fight.fighter1.id)
        const groupId = groupLetter ? groupsMap.get(groupLetter) : undefined

        await http.post(API_ROUTES.FIGHTS.ROOT, {
          tournament_id: tournamentId,
          nomination_id: nominationId,
          group_id: groupId || null,
          competitor1_id: competitor1Id,
          competitor2_id: competitor2Id,
          stage: newStage,
          fight_number: fight.number
        })
      }
    }

    return { success: true, newStage }
  } catch (error) {
    console.error('Error saving tournament data:', error)
    throw error
  }
}

// Helper function to find competitor ID by fighter ID
const findCompetitorId = async (
  fighterId: number,
  tournamentId: number,
  nominationId: number
): Promise<number | null> => {
  try {
    const url = API_ROUTES.COMPETITORS.BY_TOURNAMENT_AND_NOMINATION(tournamentId, nominationId)
    const { data: competitors } = await http.get(url)
    const competitor = competitors.find((c: any) => c.fighter_id === fighterId)
    return competitor?.id || null
  } catch {
    return null
  }
}

// Fetch groups and group members from database
export const loadGroupsAndFights = async (
  tournamentId: number,
  nominationId: number,
  stage: number
) => {
  try {
    // 1. Fetch all competitors for this tournament and nomination
    const competitorsUrl = API_ROUTES.COMPETITORS.BY_TOURNAMENT_AND_NOMINATION(
      tournamentId,
      nominationId
    )
    let { data: allCompetitors } = await http.get(competitorsUrl)

    const fightersListStore = useFightersListStore()
    allCompetitors = allCompetitors.map((c: any) => ({
      ...c,
      fighter: fightersListStore.getFighterById(c.fighter_id)
    }))

    // Create a map of competitor ID to fighter info
    const competitorMap = new Map<number, any>()
    for (const competitor of allCompetitors) {
      competitorMap.set(competitor.id, competitor)
    }

    // 2. Fetch groups for this tournament, nomination, and stage
    const groupsUrl = API_ROUTES.GROUPS.BY_TOURNAMENT_AND_NOMINATION(tournamentId, nominationId)
    const { data: allGroups } = await http.get(groupsUrl)
    const stageGroups = allGroups.filter((g: any) => g.stage === stage)

    // 3. Build groups with fighters
    const groups: Group[] = []
    for (const groupData of stageGroups) {
      // Fetch group members
      const groupCompetitorsUrl = API_ROUTES.GROUP_COMPETITORS.BY_GROUP(groupData.id)
      const { data: groupCompetitors } = await http.get(groupCompetitorsUrl)

      const fighters: GroupFighter[] = []

      for (const gc of groupCompetitors) {
        const fData = gc.competitor?.fighter

        if (fData) {
          fighters.push({
            ...fData,
            wins: 0,
            diff: 0
          })
        }
      }

      groups.push({
        letter: groupData.name,
        fighters
      })
    }

    // 4. Fetch fights for this tournament, nomination, and stage
    const fightsUrl = API_ROUTES.FIGHTS.BY_TOURNAMENT(tournamentId)
    const { data: allFights } = await http.get(fightsUrl)
    const stageFights = allFights.filter(
      (f: any) => f.nomination_id === nominationId && f.stage === stage
    )

    // 5. Build fight blocks (по 2 группы в блоке, как в stageGroupFights)
    const fightsBlocks: BlockData[] = []

    // Итерируемся по созданным группам с шагом 2, чтобы воссоздать блоки
    for (let i = 0; i < groups.length; i += 2) {
      const group1 = groups[i]
      const group2 = groups[i + 1] // Может быть undefined, если групп нечетное количество

      const blockLetters = [group1.letter]
      if (group2) blockLetters.push(group2.letter)

      // Находим все ID групп, входящих в этот блок
      const targetGroupIds = stageGroups
        .filter((sg: any) => sg.name === group1.letter || (group2 && sg.name === group2.letter))
        .map((sg: any) => sg.id)

      // Фильтруем бои, которые принадлежат этим группам
      const blockFightsRaw = stageFights
        .filter((f: any) => targetGroupIds.includes(f.group_id))
        // Сортируем по fight_number, чтобы сохранить порядок чередования (A1, B1, A2, B2...)
        .sort((a: any, b: any) => a.fight_number - b.fight_number)

      const blockFights: any[] = []

      for (const fight of blockFightsRaw) {
        const f1 = competitorMap.get(fight.competitor1_id)?.fighter
        const f2 = competitorMap.get(fight.competitor2_id)?.fighter

        if (f1 && f2) {
          blockFights.push({
            number: fight.fight_number,
            fighter1: f1,
            fighter2: f2,
            fighter1Score: fight.competitor1_score,
            fighter2Score: fight.competitor2_score
          })
        }
      }

      if (blockFights.length > 0) {
        fightsBlocks.push({
          letters: blockLetters,
          fights: blockFights
        })
      }
    }

    return { groups, fightsBlocks }
  } catch (error) {
    console.error('Error loading groups and fights:', error)
    return { groups: [], fightsBlocks: [] }
  }
}
