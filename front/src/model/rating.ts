export interface FighterRatingLocation {
  id: number
  name: string
}

export interface FighterRatingFighter {
  id: number
  name: string
  surname: string
  patronymic?: string | null
  country: FighterRatingLocation
  city: FighterRatingLocation
  club?: FighterRatingLocation | null
}

export interface FighterNominationRating {
  id: number
  nomination_id: number
  fighter_id: number
  rating: number
  fights_count: number
  fighter: FighterRatingFighter
}

export interface FighterProfileNomination {
  id: number
  name_ru: string
  name_en: string
}

export interface FighterProfileTournament {
  tournament_id: number
  tournament_name: string
  event_date: string | null
  nomination: FighterProfileNomination
}

export interface FighterFightCounter {
  fights: number
  wins: number
}

export interface FighterNominationFightCounter extends FighterFightCounter {
  nomination: FighterProfileNomination
}

export interface FighterRatingHistoryPoint {
  tournament_id: number
  tournament_name: string
  event_date: string | null
  rating_before: number
  rating_after: number
  fights_count_delta: number
  created_at: string
}

export interface FighterRatingSummary {
  nomination: FighterProfileNomination
  place: number
  total_fighters: number
  rating: number
  fights_count: number
  history: FighterRatingHistoryPoint[]
}

export interface FighterProfileStats {
  tournaments: FighterProfileTournament[]
  fights: {
    total: FighterFightCounter
    by_nomination: FighterNominationFightCounter[]
  }
  ratings: FighterRatingSummary[]
}
