import http from '@/api/http'
import type { Nomination } from '@/model/nomination'
import type {
  FighterNominationRating,
  FighterProfileStats,
  FighterRatingSummary,
  RussiaHmbLeaderboardRow,
  RussiaHmbTournamentNominationRating
} from '@/model/rating'
import { API_ROUTES } from '@shared/routes'

export const fetchRatingNominations = async (): Promise<Nomination[]> => {
  const { data } = await http.get<Nomination[]>(API_ROUTES.RATINGS.ROOT)
  return data
}

export const fetchRatingsByNomination = async (
  nominationId: string | number
): Promise<FighterNominationRating[]> => {
  const { data } = await http.get<FighterNominationRating[]>(
    API_ROUTES.RATINGS.BY_NOMINATION(nominationId)
  )
  return data
}

export const fetchFighterProfileStats = async (
  fighterId: string | number
): Promise<FighterProfileStats> => {
  const { data } = await http.get<FighterProfileStats>(
    API_ROUTES.RATINGS.BY_FIGHTER_PROFILE(fighterId)
  )
  return data
}

export const fetchFighterEloRatings = async (
  fighterId: string | number
): Promise<FighterRatingSummary[]> => {
  const { data } = await http.get<FighterRatingSummary[]>(
    API_ROUTES.RATINGS.BY_FIGHTER_ELO_PROFILE(fighterId)
  )
  return data
}

export const calculateRussiaHmbRating = async (payload: {
  tournament_id: number
  nomination_id: number
  coefficient: 1 | 2 | 4
}): Promise<RussiaHmbTournamentNominationRating> => {
  const { data } = await http.post<RussiaHmbTournamentNominationRating>(
    API_ROUTES.RATINGS.RUSSIA_HMB_CALCULATE,
    payload
  )
  return data
}

export const fetchRussiaHmbTournamentNominationRating = async (
  tournamentId: string | number,
  nominationId: string | number
): Promise<RussiaHmbTournamentNominationRating | null> => {
  const { data } = await http.get<RussiaHmbTournamentNominationRating | null>(
    API_ROUTES.RATINGS.RUSSIA_HMB_TOURNAMENT_NOMINATION(tournamentId, nominationId)
  )
  return data
}

export const fetchRussiaHmbYears = async (): Promise<number[]> => {
  const { data } = await http.get<number[]>(API_ROUTES.RATINGS.RUSSIA_HMB_YEARS)
  return data
}

export const fetchRussiaHmbNominationsByYear = async (
  year: string | number
): Promise<Nomination[]> => {
  const { data } = await http.get<Nomination[]>(
    API_ROUTES.RATINGS.RUSSIA_HMB_NOMINATIONS_BY_YEAR(year)
  )
  return data
}

export const fetchRussiaHmbLeaderboard = async (
  year: string | number,
  nominationId: string | number
): Promise<RussiaHmbLeaderboardRow[]> => {
  const { data } = await http.get<RussiaHmbLeaderboardRow[]>(
    API_ROUTES.RATINGS.RUSSIA_HMB_LEADERBOARD(year, nominationId)
  )
  return data
}
