import type {
  CompetitionBlock,
  CompetitionPlacement,
  CompetitionRussiaHmbRating,
  CreateDisciplinaryCardPayload,
  ActiveDisciplinaryCardSummary,
  ActiveWithdrawalSummary,
  DisciplinaryCard,
  FightData,
  Group,
  NominationCompetitor,
  Nomination,
  PendingTie,
  Tournament,
  UpdateDisciplinaryCardPayload,
  TournamentMarshal
} from '@/model'
import type { FightWarning, RoundScore } from '@shared/fightScoring'

export type TournamentReportLanguage = 'en' | 'ru'

export type ActiveCardTypes = Partial<Record<number, ActiveDisciplinaryCardSummary[]>>

export type CreateDisciplinaryCardAction = (
  payload: CreateDisciplinaryCardPayload
) => Promise<DisciplinaryCard>

export type UpdateDisciplinaryCardAction = (
  id: number,
  payload: UpdateDisciplinaryCardPayload
) => Promise<DisciplinaryCard>

export type DeleteDisciplinaryCardAction = (id: number) => Promise<void>

export interface CreateFightWithdrawalPayload {
  fightId: number
  competitorId: number
  reason: string
  isExcused: boolean
}

export type CreateNoShowWithdrawalAction = (competitorId: number) => Promise<void>
export type CreateFightWithdrawalAction = (
  payload: CreateFightWithdrawalPayload
) => Promise<void>
export type CancelWithdrawalAction = (withdrawalId: number) => Promise<void>
export type ActiveWithdrawalTypes = Partial<Record<number, ActiveWithdrawalSummary>>

export interface TournamentBlockDisplayProps {
  canEditCompetition: boolean
  canUseCompetitionBackwardActions: boolean
  canManageCards: boolean
  canIssueCards: boolean
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

export interface TournamentCompetitionBlockState {
  block: CompetitionBlock
  title: string
  isOpen: boolean
  pendingTie: PendingTie | null
  redCardGroupFighterKeys: Set<string>
  tournamentId: number
  isOlympicPairsFixing: boolean
}

export interface TournamentCompetitionBlockPermissions {
  canEditCompetition: boolean
  canUseCompetitionBackwardActions: boolean
  canManageCards: boolean
  canIssueCards: boolean
}

export interface TournamentCompetitionBlockOptions {
  canGenerateGroupFights: boolean
  hasBlockingGroupAdvancementTie: boolean
  olympicCompetitorIds: Set<number>
}

export interface TournamentCompetitionBlockCards {
  cardIssueDate: string
  activeCardTypes: ActiveCardTypes
  tournamentMarshals: TournamentMarshal[]
  createDisciplinaryCard: CreateDisciplinaryCardAction
  createWithdrawal: CreateFightWithdrawalAction
  cancelWithdrawal: CancelWithdrawalAction
  attachedCardCountByFightId: Record<number, number>
}

export interface TournamentCompetitionBlockActions {
  setOpen(isOpen: boolean): void
  generateGroupFights(blockId: number): void
  rollbackBlock(blockId: number): void
  fixGroupResults(blockId: number): void
  cancelGroupFightsFixation(blockId: number): void
  cancelGroupResultsFixation(blockId: number): void
  refreshCardsAndCompetition(): void
  updateFightScore(payload: FightScoreUpdatePayload): void
  updateGroups(groups: Group[]): void
  swapOlympicSlots(payload: OlympicSlotSwapPayload): void
  fixOlympicPairs(blockId: number): void
  fixOlympicRoundResults(payload: OlympicRoundResultsPayload): void
  cancelOlympicRoundResultsFixation(payload: OlympicRoundPayload): void
  cancelOlympicPairFixation(payload: OlympicRoundPayload): void
  rollbackOlympicRound(payload: OlympicRoundPayload): void
  rollbackOlympicPendingPairs(blockId: number): void
}

export interface TournamentNominations {
  all: Nomination[]
  open: Nomination[]
}

export interface TournamentNominationTabsState {
  tournament: Tournament | null
  tournamentId: number
  activeTab: number
  tournamentNominations: TournamentNominations
  isNominationLoading: boolean
  placements: CompetitionPlacement[]
  nominationCompetitors: NominationCompetitor[]
  isCompetitorsListOpen: boolean
  isCurrentNominationOpen: boolean
  hasTournamentMarshals: boolean
  canCloseRegistration: boolean
  closeRegistrationHint: string
  blocks: CompetitionBlock[]
  activeBlock: CompetitionBlock | null
  pendingTie: PendingTie | null
  activeOlympicFinalResultsFixed: boolean
  nominationFinished: boolean
  russiaHmbRating: CompetitionRussiaHmbRating
}

export interface TournamentNominationTabsPermissions {
  canEditCompetition: boolean
  canUseCompetitionBackwardActions: boolean
  canManageCards: boolean
  canIssueCards: boolean
  canCalculateRussiaHmbRating: boolean
}

export interface TournamentNominationTabsCompetitionOptions {
  canGenerateGroupFights: boolean
  hasBlockingGroupAdvancementTie: boolean
  olympicCompetitorIds: Set<number>
  canOfferOlympic: boolean
  canOfferOlympicWithThirdPlaces: boolean
}

export interface TournamentNominationTabsCards {
  activeCardTypes: ActiveCardTypes
  cardIssueDate: string
  tournamentMarshals: TournamentMarshal[]
  createDisciplinaryCard: CreateDisciplinaryCardAction
  attachedCardCountByFightId: Record<number, number>
}

export interface TournamentNominationTabsActions {
  setActiveTab(value: number): void
  setCompetitorsListOpen(value: boolean): void
  closeRegistration(): void
  removeCompetitor(fighterId: number, nominationId: number): void
  openRegistration(): void
  deleteNomination(): void
  createGroupBlock(): void
  createOlympicBlock(includeThirdPlaces?: boolean): void
  generateGroupFights(blockId: number): void
  rollbackBlock(blockId: number): void
  fixGroupResults(blockId: number): void
  cancelGroupFightsFixation(blockId: number): void
  cancelGroupResultsFixation(blockId: number): void
  finishCompetition(): void
  calculateRussiaHmbRating(coefficient: 1 | 2 | 4): Promise<void>
  refreshCardsAndCompetition(): void
  createNoShowWithdrawal: CreateNoShowWithdrawalAction
  createFightWithdrawal: CreateFightWithdrawalAction
  cancelWithdrawal: CancelWithdrawalAction
  setBlockIsOpen(block: CompetitionBlock, isOpen: boolean): void
  updateFightScore(payload: FightScoreUpdatePayload): void
  updateGroups(groups: Group[]): void
  resolveTie(pendingTie: PendingTie, orderedCompetitorIds: number[]): void
  swapOlympicSlots(payload: OlympicSlotSwapPayload): void
  fixOlympicPairs(blockId: number): void
  fixOlympicRoundResults(payload: OlympicRoundResultsPayload): void
  cancelOlympicRoundResultsFixation(payload: OlympicRoundPayload): void
  cancelOlympicPairFixation(payload: OlympicRoundPayload): void
  rollbackOlympicRound(payload: OlympicRoundPayload): void
  rollbackOlympicPendingPairs(blockId: number): void
  blockTitle: TournamentBlockTitleGetter
  getBlockIsOpen: TournamentBlockOpenGetter
  getOlympicPairsFixing: TournamentBlockOpenGetter
  getRedCardGroupFighterKeys: TournamentRedCardGroupKeyGetter
}

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
