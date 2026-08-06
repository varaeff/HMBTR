export type DisciplinaryCardType = 'YELLOW' | 'RED';
export type DisciplinaryCardSource = 'MANUAL' | 'AUTOMATIC';

export interface DisciplinaryCard {
  id: number;
  fighter_id: number;
  tournament_id: number;
  fight_id: number;
  marshal_id: number;
  type: DisciplinaryCardType;
  source: DisciplinaryCardSource;
  received_at: Date;
  reason: string;
  expires_at: Date;
  expires_at_locked: boolean;
  active: boolean;
  created_at: Date;
  updated_at: Date;
  fight_number: number;
  fight_stage: number;
  tournament_name: string;
  nomination_id: number;
  nomination_name_ru: string;
  nomination_name_en: string;
  bracket_round: number | null;
  bracket_position: number | null;
  is_bronze: boolean;
  group_name: string | null;
  opponent_id: number;
  fighter_name: string;
  fighter_surname: string;
  fighter_patronymic: string | null;
  opponent_name: string;
  opponent_surname: string;
  opponent_patronymic: string | null;
  marshal_name: string;
  marshal_surname: string;
  marshal_patronymic: string | null;
  can_manage: boolean;
  can_change_result_fields: boolean;
  can_delete: boolean;
  can_activate: boolean;
}

export interface ActiveDisciplinaryCardSummary {
  id: number;
  fighter_id: number;
  type: DisciplinaryCardType;
  active: boolean;
  tournament_id: number;
  tournament_name: string;
  reason: string;
  received_at: Date;
  expires_at: Date;
}

export interface CardFightLockState {
  fight_locked: boolean;
  results_fixed: boolean;
}

export interface StoredDisciplinaryCard {
  id: number;
  fighter_id: number;
  tournament_id: number;
  fight_id: number;
  marshal_id: number;
  type: DisciplinaryCardType;
  source: DisciplinaryCardSource;
  received_at: Date;
  reason: string;
  expires_at: Date;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ActiveYellowCard {
  id: number;
  tournament_id: number;
  fight_id: number;
  marshal_id: number;
  received_at: Date;
}

export interface InsertDisciplinaryCardParams {
  fighterId: number;
  tournamentId: number;
  fightId: number;
  marshalId: number;
  type: DisciplinaryCardType;
  source: DisciplinaryCardSource;
  receivedAt: Date;
  reason: string;
  expiresAt: Date;
  active: boolean;
}

export interface UpdateDisciplinaryCardParams {
  id: number;
  reason: string;
  type: DisciplinaryCardType;
  marshalId: number;
  active: boolean;
  receivedAt: Date;
  expiresAt: Date;
}
