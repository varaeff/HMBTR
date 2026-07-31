export interface Nomination {
  id: number
  name_ru: string
  name_en: string
  is_male: boolean
  rounds: 1 | 2 | 3
  round_win: boolean
  tournaments_count?: number
  can_delete?: boolean
}

export interface NominationPayload {
  name_ru: string
  name_en: string
  is_male: boolean
  rounds: 1 | 2 | 3
  round_win: boolean
  confirm_existing_fights?: boolean
}
