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

export interface RussiaHmbRatingResult {
  id: number
  fighter_id: number
  competitor_id: number
  points: number
  qc_points: number
  qn_points: number
  qm_points: number
  yellow_cards_count: number
  active_red_cards_count: number
  no_show_penalty_count: number
  fighter: FighterRatingFighter
}

export interface RussiaHmbTournamentNominationRating {
  calculation: {
    id: number
    tournament_nomination_id: number
    tournament_id: number
    nomination_id: number
    event_year: number
    coefficient: number
    calculated_at: string
  }
  results: RussiaHmbRatingResult[]
}

export interface RussiaHmbLeaderboardRow {
  fighter_id: number
  points: number
  tournaments_count: number
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
  nominations: Array<{
    nomination: FighterProfileNomination
    russia_hmb_rating_points: number | null
  }>
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
  russia_hmb_ratings: FighterRussiaHmbYearSummary[]
}

export interface FighterRussiaHmbYearSummary {
  year: number
  nominations: Array<{
    nomination: FighterProfileNomination
    points: number
    tournaments_count: number
  }>
}
