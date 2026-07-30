import type {
  CompetitionBlock,
  CreateDisciplinaryCardPayload,
  DisciplinaryCardStatus,
  DisciplinaryCard,
  FightData,
  UpdateDisciplinaryCardPayload,
  TournamentMarshal
} from '@/model'
import type { FightWarning, RoundScore } from '@shared/fightScoring'

export type TournamentReportLanguage = 'en' | 'ru'

export type ActiveCardTypes = Partial<Record<number, DisciplinaryCardStatus>>

export type CreateDisciplinaryCardAction = (
  payload: CreateDisciplinaryCardPayload
) => Promise<DisciplinaryCard>

export type UpdateDisciplinaryCardAction = (
  id: number,
  payload: UpdateDisciplinaryCardPayload
) => Promise<DisciplinaryCard>

export type DeleteDisciplinaryCardAction = (id: number) => Promise<void>

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

export interface OlympicSlotSwapPayload {
  blockId: number
  sourcePosition: number
  targetPosition: number
}

export interface OlympicRoundPayload {
  blockId: number
  round: number
}

export interface OlympicRoundResultsPayload extends OlympicRoundPayload {
  fights: FightData[]
}
