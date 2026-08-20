import type { Fighter } from '@/model/fighter'
import type { RussiaHmbTournamentNominationRating } from '@/model/rating'
import type { RoundScore } from '@shared/fightScoring'

export interface ActiveWithdrawalSummary {
  id: number
  competitorId: number
  reason: string
  isExcused: boolean
  source: 'NO_SHOW' | 'FIGHT' | string
  sourceFightId?: number | null
}

export interface NominationCompetitor extends Fighter {
  competitorId: number
  withdrawal?: ActiveWithdrawalSummary | null
}

export interface GroupFighter extends Fighter {
  competitorId?: number
  withdrawal?: ActiveWithdrawalSummary | null
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
  fighter1EffectiveScore?: number
  fighter2EffectiveScore?: number
  roundScores: RoundScore[]
  warnings?: Array<{ competitorId: number; round: number; reason: string }>
  rounds: 1 | 2 | 3
  roundWin: boolean
  mainRoundTime?: number
  additionalRoundTime?: number
  isResultValid: boolean
  winnerId?: number | null
  forfeitCardId?: number | null
  forfeitWithdrawalId?: number | null
  isTechnicalForfeit?: boolean
  fighter1Withdrawal?: ActiveWithdrawalSummary | null
  fighter2Withdrawal?: ActiveWithdrawalSummary | null
  bracketRound?: number
  bracketPosition?: number
  isBronze?: boolean
  isFinished?: boolean
}

export interface BlockData {
  letters: string[]
  fights: FightData[]
}

export interface Competitor {
  id: number
  fighter_id: number
  tournament_id: number
  nomination_id: number
}

export interface FighterRegistrationEligibility {
  fighter_id: number
  nomination_ids: number[]
}

export type CompetitionBlockType = 'GROUP' | 'OLYMPIC'
export type CompetitionBlockStatus = 'ACTIVE' | 'LOCKED'
export type CompetitionLifecycleState = 'FORMATION_EDITABLE' | 'FIGHTS_EDITABLE' | 'RESULTS_FIXED'

export interface CompetitionRoundState {
  round: number
  pairsFixed: boolean
  resultsFixed: boolean
}

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
  lifecycleState: CompetitionLifecycleState
  groups: Group[]
  fights: FightData[]
  fightsBlocks: BlockData[]
  bracketSlots: BracketSlot[]
  roundStates: CompetitionRoundState[]
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

export type PendingTieScope = 'GROUP' | 'OLYMPIC_THIRD' | 'OLYMPIC_DOUBLE_RED'

export interface PendingTie {
  blockId: number
  groupId: number | null
  fightId?: number | null
  competitorIds: number[]
  scope?: PendingTieScope
}

export type CompetitionRussiaHmbRating = RussiaHmbTournamentNominationRating | null
