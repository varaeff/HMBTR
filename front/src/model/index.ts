export interface Fighter {
  id: number
  name: string
  surname: string
  patronymic?: string
  birthday?: Date | null
  country: string
  city: string
  club?: string
  pic?: string
}

export interface FighterDB {
  id?: number
  name: string
  surname: string
  patronymic?: string
  birthday?: string
  country_id: number
  city_id: number
  club_id?: number | null
  pic?: string
}

export interface Tournament {
  country_id?: number
  city_id?: number
  id: number
  name: string
  event_date: Date
  country: string
  city: string
  nominations_ids: number[]
}

export interface TournamentDB {
  id?: number
  name: string
  event_date: Date
  country_id: number
  city_id: number
  nominations_ids: number[]
}

export interface Country {
  id: number
  name: string
}

export interface City {
  id: number
  name: string
  country_id: number
}

export interface Club {
  id: number
  name: string
  city_id: number
}

export interface LocationProps {
  country: string
  city: string
  club: string
  country_id: number
  city_id: number
  club_id: number
  needClub: boolean
}

export interface Nomination {
  id: number
  name_ru: string
  name_en: string
}
