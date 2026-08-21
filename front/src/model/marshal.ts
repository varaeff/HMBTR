export interface MarshalCategory {
  id: number
  name_ru: string
  name_en: string
}

export interface MarshalDB {
  id?: number
  name: string
  surname: string
  patronymic?: string
  country_id: number
  city_id: number
  category_id: number
  pic?: string
  category?: MarshalCategory
}

export interface Marshal {
  id: number
  name: string
  surname: string
  patronymic?: string
  country_id?: number
  city_id?: number
  category_id: number
  country: string
  city: string
  pic?: string
  category?: MarshalCategory
}

export interface TournamentMarshalDB {
  id: number
  tournament_id: number
  marshal_id: number
  created_at: string
  is_chief_judge: boolean
  marshal: MarshalDB
}

export interface TournamentMarshal {
  id: number
  tournament_id: number
  marshal_id: number
  is_chief_judge: boolean
  marshal: Marshal
}

export interface MarshalProfileTournament {
  id: number
  name: string
  event_date: string | null
  country: {
    id: number
    name: string
  }
  city: {
    id: number
    name: string
  }
}

export interface MarshalProfileDB extends MarshalDB {
  tournaments: Array<{
    id: number
    tournament_id: number
    marshal_id: number
    tournament: MarshalProfileTournament
  }>
}
