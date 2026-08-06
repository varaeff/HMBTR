import type { Fighter } from '@/model/fighter'

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
  fighter1EffectiveScore?: number
  fighter2EffectiveScore?: number
  roundScores: Array<{ competitor1Score: number; competitor2Score: number }>
  warnings?: Array<{ competitorId: number; round: number; reason: string }>
  rounds: 1 | 2 | 3
  roundWin: boolean
  isResultValid: boolean
  winnerId?: number | null
  forfeitCardId?: number | null
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
