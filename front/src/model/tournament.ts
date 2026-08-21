export interface TournamentNomination {
  id: number
  tournament_id: number
  nomination_id: number
  is_open: boolean
  stage: number
  is_finished: boolean
}

export interface Tournament {
  country_id?: number
  city_id?: number
  id: number
  name: string
  event_date: Date
  country: string
  city: string
  nominations: TournamentNomination[]
  secretary_name?: string | null
}

export interface TournamentDB {
  id?: number
  name: string
  event_date: Date
  country_id: number
  city_id: number
  nominations_ids: number[]
  secretary_name?: string | null
}
