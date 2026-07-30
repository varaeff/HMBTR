import type {
  CompetitionBlock,
  DisciplinaryCardStatus,
  TournamentMarshal
} from '@/model'
import type { FightWarning, RoundScore } from '@shared/fightScoring'

export type TournamentReportLanguage = 'en' | 'ru'

export type ActiveCardTypes = Partial<Record<number, DisciplinaryCardStatus>>

export interface TournamentBlockDisplayProps {
  canEditCompetition: boolean
  canUseCompetitionBackwardActions: boolean
  canManageCards: boolean
  canGenerateGroupFights: boolean
  hasBlockingGroupAdvancementTie: boolean
  olympicCompetitorIds: Set<number>
  activeCardTypes: ActiveCardTypes
  tournamentMarshals: TournamentMarshal[]
  attachedCardCountByFightId: Record<number, number>
}

export type TournamentBlockTitleGetter = (block: CompetitionBlock) => string
export type TournamentBlockOpenGetter = (block: CompetitionBlock) => boolean
export type TournamentBlockOpenSetter = (block: CompetitionBlock, isOpen: boolean) => void
export type TournamentRedCardGroupKeyGetter = (block: CompetitionBlock) => Set<string>

export interface FightScoreDraftUpdate {
  roundScores?: RoundScore[]
  warnings?: FightWarning[]
}

export interface FightScoreUpdatePayload {
  fightId: number
  fightNumber: number
  scores: FightScoreDraftUpdate
}
