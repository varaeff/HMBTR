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
  is_male?: boolean
}

export interface Fighter {
  id: number
  name: string
  surname: string
  patronymic?: string
  birthday?: Date | null
  country_id?: number
  city_id?: number
  club_id?: number | null
  country: string
  city: string
  club?: string
  pic?: string
  is_male?: boolean
}
