import http from '@/api/http'
import type {
  Competitor,
  FightData,
  FighterRegistrationEligibility,
  Group,
  PendingTie
} from '@/model/competition'
import { buildSubmittedFightResult } from '@/lib/fightResult'
import { API_ROUTES } from '@shared/routes'
import type { RawCompetitionState } from './mapper'

const groupCompetitorIds = (group: Group) =>
  group.fighters
    .map((fighter) => fighter.competitorId)
    .filter((competitorId): competitorId is number => Boolean(competitorId))

export const fetchCompetitionState = async (tournamentId: number, nominationId: number) => {
  const { data } = await http.get<RawCompetitionState>(
    API_ROUTES.COMPETITION.STATE(tournamentId, nominationId)
  )
  return data
}

export const fetchTournamentCompetitors = async (tournamentId: number) => {
  const { data } = await http.get<Competitor[]>(
    API_ROUTES.COMPETITORS.BY_TOURNAMENT(tournamentId)
  )
  return data
}

export const fetchRegistrationEligibility = async (tournamentId: number) => {
  const { data } = await http.get<FighterRegistrationEligibility[]>(
    API_ROUTES.COMPETITORS.ELIGIBILITY(tournamentId)
  )
  return data
}

export const registerFighter = async (
  tournamentId: number,
  fighterId: number,
  nominationId: number
) => {
  const { data } = await http.post<Competitor>(API_ROUTES.COMPETITORS.ROOT, {
    fighter_id: fighterId,
    tournament_id: tournamentId,
    nomination_id: nominationId
  })
  return data
}

export const deleteCompetitor = async (competitorId: number) => {
  await http.delete(`${API_ROUTES.COMPETITORS.ROOT}/${competitorId}`)
}

export const createNoShowWithdrawal = async (
  tournamentId: number,
  nominationId: number,
  competitorId: number
) => {
  const { data } = await http.post<RawCompetitionState>(API_ROUTES.COMPETITION.WITHDRAWAL_NO_SHOW, {
    tournament_id: tournamentId,
    nomination_id: nominationId,
    competitor_id: competitorId
  })
  return data
}

export const createFightWithdrawal = async ({
  fightId,
  competitorId,
  reason,
  isExcused
}: {
  fightId: number
  competitorId: number
  reason: string
  isExcused: boolean
}) => {
  const { data } = await http.post<RawCompetitionState>(API_ROUTES.COMPETITION.WITHDRAWAL_FIGHT, {
    fight_id: fightId,
    competitor_id: competitorId,
    reason,
    is_excused: isExcused
  })
  return data
}

export const cancelWithdrawal = async (withdrawalId: number) => {
  const { data } = await http.post<RawCompetitionState>(API_ROUTES.COMPETITION.WITHDRAWAL_CANCEL, {
    withdrawal_id: withdrawalId
  })
  return data
}

export const createGroupBlock = async (tournamentId: number, nominationId: number) => {
  const { data } = await http.post<RawCompetitionState>(API_ROUTES.COMPETITION.GROUP_BLOCK, {
    tournament_id: tournamentId,
    nomination_id: nominationId
  })
  return data
}

export const generateGroupFights = async (blockId: number, groups: Group[]) => {
  const { data } = await http.post<RawCompetitionState>(API_ROUTES.COMPETITION.GROUP_FIGHTS, {
    block_id: blockId,
    groups: groups.map((group) => ({
      letter: group.letter,
      competitor_ids: groupCompetitorIds(group)
    }))
  })
  return data
}

export const createOlympicBlock = async (
  tournamentId: number,
  nominationId: number,
  includeThirdPlaces: boolean
) => {
  const { data } = await http.post<RawCompetitionState>(API_ROUTES.COMPETITION.OLYMPIC_BLOCK, {
    tournament_id: tournamentId,
    nomination_id: nominationId,
    include_third_places: includeThirdPlaces
  })
  return data
}

export const generateOlympicFights = async (blockId: number) => {
  const { data } = await http.post<RawCompetitionState>(API_ROUTES.COMPETITION.OLYMPIC_FIGHTS, {
    block_id: blockId
  })
  return data
}

export const swapBracketSlots = async (
  blockId: number,
  sourcePosition: number,
  targetPosition: number
) => {
  const { data } = await http.patch<RawCompetitionState>(
    API_ROUTES.COMPETITION.SWAP_BRACKET_SLOTS,
    {
      block_id: blockId,
      source_position: sourcePosition,
      target_position: targetPosition
    }
  )
  return data
}

export const resolveTie = async (
  tournamentId: number,
  nominationId: number,
  pendingTie: PendingTie,
  orderedCompetitorIds: number[]
) => {
  const { data } = await http.post<RawCompetitionState>(API_ROUTES.COMPETITION.RESOLVE_TIES, {
    tournament_id: tournamentId,
    nomination_id: nominationId,
    group_id: pendingTie.groupId ?? undefined,
    block_id: pendingTie.blockId,
    fight_id: pendingTie.fightId ?? undefined,
    tie_scope: pendingTie.scope ?? 'GROUP',
    ordered_competitor_ids: orderedCompetitorIds
  })
  return data
}

export const finishCompetition = async (tournamentId: number, nominationId: number) => {
  const { data } = await http.post<RawCompetitionState>(API_ROUTES.COMPETITION.FINISH, {
    tournament_id: tournamentId,
    nomination_id: nominationId
  })
  return data
}

export const fixResults = async (blockId: number, fights: FightData[], round?: number) => {
  const { data } = await http.post<RawCompetitionState>(API_ROUTES.COMPETITION.FIX_RESULTS, {
    block_id: blockId,
    round,
    fights: fights.map(buildSubmittedFightResult)
  })
  return data
}

export const cancelResultsFixation = async (blockId: number, round?: number) => {
  const { data } = await http.post<RawCompetitionState>(
    API_ROUTES.COMPETITION.CANCEL_RESULTS_FIXATION,
    {
      block_id: blockId,
      round
    }
  )
  return data
}

export const cancelFightsFixation = async (blockId: number, round?: number) => {
  const { data } = await http.post<RawCompetitionState>(
    API_ROUTES.COMPETITION.CANCEL_FIGHTS_FIXATION,
    {
      block_id: blockId,
      round
    }
  )
  return data
}

export const rollback = async (
  blockId: number,
  round?: number,
  removeActiveRedCompetitors = false
) => {
  const { data } = await http.post<RawCompetitionState>(API_ROUTES.COMPETITION.ROLLBACK, {
    block_id: blockId,
    round,
    remove_active_red_competitors: removeActiveRedCompetitors || undefined
  })
  return data
}
