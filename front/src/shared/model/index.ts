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
  id: number
  name: string
  surname: string
  patronymic?: string
  birthday?: Date | null
  country_id: number
  city_id: number
  club_id?: number
  pic?: string
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
