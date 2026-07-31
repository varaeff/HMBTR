import http from '@/api/http'
import type { Nomination } from '@/model/nomination'
import type { FighterNominationRating, FighterProfileStats } from '@/model/rating'
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
