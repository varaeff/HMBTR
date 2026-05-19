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

export interface GroupFighter extends Fighter {
  competitorId?: number
  wins: number
  diff: number
}

export interface Group {
  id?: number
  letter: string
  fighters: GroupFighter[]
  placements?: GroupPlacement[]
}

export interface FightData {
  id: number
  number: number
  groupId?: number
  fighter1: Fighter
  fighter2: Fighter
  competitor1Id?: number
  competitor2Id?: number
  fighter1Score: number
  fighter2Score: number
  bracketRound?: number
  bracketPosition?: number
  isBronze?: boolean
  isFinished?: boolean
}

export interface BlockData {
  letters: string[]
  fights: FightData[]
}

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
  is_male: boolean
}

export interface User {
  id: number
  username: string
  name: string
  surname: string
  patronymic?: string
  email?: string
  is_admin: boolean
  is_organizer: boolean
}

export const USERS_TYPES = {
  ALL: 'usersTabsAll',
  ADMINS: 'usersTabsAdmins',
  ORGANIZERS: 'usersTabsOrganizers',
  OTHERS: 'usersTabsOthers'
} as const

export type UserType = (typeof USERS_TYPES)[keyof typeof USERS_TYPES]

export interface UsersResponse {
  [USERS_TYPES.ADMINS]: User[]
  [USERS_TYPES.ORGANIZERS]: User[]
  [USERS_TYPES.OTHERS]: User[]
}

export interface Competitor {
  id: number
  fighter_id: number
  tournament_id: number
  nomination_id: number
}

export type CompetitionBlockType = 'GROUP' | 'OLYMPIC'
export type CompetitionBlockStatus = 'ACTIVE' | 'LOCKED'

export interface BracketSlot {
  id: number
  competitorId: number
  seedPosition: number
  slotPosition: number
  fighter: GroupFighter
}

export interface CompetitionBlock {
  id: number
  type: CompetitionBlockType
  stage: number
  status: CompetitionBlockStatus
  groups: Group[]
  fights: FightData[]
  fightsBlocks: BlockData[]
  bracketSlots: BracketSlot[]
}

export interface CompetitionPlacement {
  place: number
  competitorId: number
  fighter: Fighter
}

export interface GroupPlacement {
  place: number
  competitorId: number
}

export interface PendingTie {
  blockId: number
  groupId: number
  competitorIds: number[]
}

export type DisciplinaryCardType = 'YELLOW' | 'RED'
export type DisciplinaryCardSource = 'MANUAL' | 'AUTOMATIC'

export interface DisciplinaryCard {
  id: number
  fighter_id: number
  tournament_id: number
  fight_id: number
  type: DisciplinaryCardType
  source: DisciplinaryCardSource
  received_at: string
  reason: string
  expires_at: string
  created_at: string
  updated_at: string
  fight_number: number
  fight_stage: number
  tournament_name: string
  nomination_id: number
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
}

export interface CreateDisciplinaryCardPayload {
  fighter_id: number
  tournament_id: number
  fight_id: number
  type: DisciplinaryCardType
  received_at: string
  reason: string
}

export type UpdateDisciplinaryCardPayload = Partial<CreateDisciplinaryCardPayload>
