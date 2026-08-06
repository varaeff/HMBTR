export type DisciplinaryCardType = 'YELLOW' | 'RED'
export type DisciplinaryCardSource = 'MANUAL' | 'AUTOMATIC'

export interface DisciplinaryCardStatus {
  type: DisciplinaryCardType
  active: boolean
}

export interface ActiveDisciplinaryCardSummary extends DisciplinaryCardStatus {
  id: number
  fighter_id: number
  tournament_id: number
  tournament_name: string
  reason: string
  received_at: string
  expires_at: string
}

export interface DisciplinaryCard {
  id: number
  fighter_id: number
  tournament_id: number
  fight_id: number
  marshal_id: number
  type: DisciplinaryCardType
  source: DisciplinaryCardSource
  received_at: string
  reason: string
  expires_at: string
  expires_at_locked: boolean
  active: boolean
  created_at: string
  updated_at: string
  fight_number: number
  fight_stage: number
  tournament_name: string
  nomination_id: number
  nomination_name_ru: string
  nomination_name_en: string
  bracket_round: number | null
  bracket_position: number | null
  is_bronze: boolean
  group_name: string | null
  opponent_id: number
  fighter_name: string
  fighter_surname: string
  fighter_patronymic: string | null
  opponent_name: string
  opponent_surname: string
  opponent_patronymic: string | null
  marshal_name: string
  marshal_surname: string
  marshal_patronymic: string | null
  can_manage: boolean
  can_change_result_fields: boolean
  can_delete: boolean
  can_activate: boolean
}

export interface CreateDisciplinaryCardPayload {
  fighter_id: number
  tournament_id: number
  fight_id: number
  marshal_id: number
  type: DisciplinaryCardType
  received_at: string
  reason: string
}

export interface UpdateDisciplinaryCardPayload {
  type?: DisciplinaryCardType
  reason?: string
  marshal_id?: number
  expires_at?: string
  active?: boolean
}

export type YellowExpirationMode = 'END_OF_YEAR_MONTH' | 'DAYS'

export interface DisciplinaryCardSettings {
  id: number
  yellow_expiration_mode: YellowExpirationMode
  yellow_expiration_month: number
  yellow_expiration_days: number
  red_auto_yellow_days: number
  red_manual_days: number
  red_manual_with_one_yellow_days: number
  red_manual_with_two_or_more_yellows_days: number
  updated_at: string
}
