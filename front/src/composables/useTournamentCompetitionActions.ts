import { reactive, type ComputedRef, type Ref } from 'vue'
import {
  type ActiveRedRollbackDetails,
  type ActiveRedRollbackCompetitor,
  getActiveRedRollbackDetails
} from '@/composables/tournamentPageErrors'
import { tData } from '@/lib/utils'
import { getIncompleteFightNumbers } from '@/lib/fightResult'
import type {
  CompetitionBlock,
  Competitor,
  CreateDisciplinaryCardPayload,
  DisciplinaryCard,
  FightData,
  Group,
  PendingTie,
  Tournament,
  UpdateDisciplinaryCardPayload
} from '@/model'
import type {
  FightScoreUpdatePayload,
  OlympicRoundPayload,
  OlympicRoundResultsPayload,
  OlympicSlotSwapPayload
} from '@/widgets/tournament/types'
import type { FightWarning, RoundScore } from '@shared/fightScoring'

type Translate = (key: string, options?: Record<string, string | number>) => string

type RequestBackwardConfirmation = (mainText: string, action: () => Promise<void>) => void

interface TournamentNominationStore {
  updateTournamentNomination(
    tournamentId: number,
    nominationId: number,
    isOpen: boolean
  ): Promise<void>
}

interface CompetitionWorkflowStore {
  tournamentCompetitors: Competitor[]
  getBlocks: CompetitionBlock[]
  setRegistrationOpen(isOpen: boolean): void
  deleteCompetitor(competitorId: number): Promise<void>
  createGroupBlock(): Promise<void>
  createOlympicBlock(includeThirdPlaces?: boolean): Promise<void>
  updateGlobalScore(payload: {
    fightId: number
    fightNumber: number
    roundScores?: RoundScore[]
    warnings?: FightWarning[]
  }): void
  setGroups(groups: Group[]): void
  resolveTie(pendingTie: PendingTie, orderedCompetitorIds: number[]): Promise<void>
  swapBracketSlots(
    blockId: number,
    sourcePosition: number,
    targetPosition: number
  ): Promise<void>
  generateOlympicFights(blockId: number): Promise<void>
  fixResults(blockId: number, fights: FightData[], round?: number): Promise<void>
  cancelResultsFixation(blockId: number, round?: number): Promise<void>
  cancelFightsFixation(blockId: number, round?: number): Promise<void>
  rollback(blockId: number, round?: number, removeActiveRedCompetitors?: boolean): Promise<void>
  setCompetitors(): Promise<void>
  loadCompetitionState(): Promise<void>
  generateGroupFights(blockId: number): Promise<void>
  finishCompetition(): Promise<void>
}

interface ApiUiErrorStore {
  setError(message: string): void
}

interface TournamentCardsCommandStore {
  loadTournamentCards(tournamentId: number): Promise<void>
  createCard(payload: CreateDisciplinaryCardPayload): Promise<DisciplinaryCard>
  updateCard(id: number, payload: UpdateDisciplinaryCardPayload): Promise<DisciplinaryCard>
  deleteCard(id: number): Promise<void>
}

interface TournamentCompetitionActionsParams {
  tournamentId: Ref<number>
  tournament: Ref<Tournament | null>
  activeTab: Ref<number>
  blocks: ComputedRef<CompetitionBlock[]>
  currentLanguage: ComputedRef<string>
  hasTournamentMarshals: ComputedRef<boolean>
  tournamentsListStore: TournamentNominationStore
  competitionStore: CompetitionWorkflowStore
  apiUiStore: ApiUiErrorStore
  cardsStore: TournamentCardsCommandStore
  translate: Translate
  requestBackwardConfirmation: RequestBackwardConfirmation
  getReportErrorMessage(error: unknown): Promise<string>
  getBlockDeletionCounts(blockId: number): Record<string, number>
  getOlympicRoundDeletionCounts(blockId: number, round: number): Record<string, number>
}

export const useTournamentCompetitionActions = ({
  tournamentId,
  tournament,
  activeTab,
  blocks,
  currentLanguage,
  hasTournamentMarshals,
  tournamentsListStore,
  competitionStore,
  apiUiStore,
  cardsStore,
  translate,
  requestBackwardConfirmation,
  getReportErrorMessage,
  getBlockDeletionCounts,
  getOlympicRoundDeletionCounts
}: TournamentCompetitionActionsParams) => {
  const olympicPairsFixingByBlockId = reactive<Record<number, boolean>>({})

  const setCurrentNominationOpen = (isOpen: boolean) => {
    const targetNom = tournament.value?.nominations.find(
      (nomination) => nomination.nomination_id === activeTab.value
    )

    if (targetNom) {
      targetNom.is_open = isOpen
    }
  }

  const refreshCardsAndCompetition = async () => {
    await cardsStore.loadTournamentCards(tournamentId.value)
    await competitionStore.setCompetitors()
    if (activeTab.value) {
      await competitionStore.loadCompetitionState()
    }
  }

  const closeRegistration = async () => {
    if (!hasTournamentMarshals.value) {
      apiUiStore.setError(translate('tournamentPageAddJudgesHint'))
      return
    }

    await tournamentsListStore.updateTournamentNomination(tournamentId.value, activeTab.value, false)
    competitionStore.setRegistrationOpen(false)
    setCurrentNominationOpen(false)
  }

  const openRegistration = async () => {
    await tournamentsListStore.updateTournamentNomination(tournamentId.value, activeTab.value, true)
    competitionStore.setRegistrationOpen(true)
    setCurrentNominationOpen(true)
  }

  const removeCompetitor = async (fighterId: number, nominationId: number) => {
    const competitor = competitionStore.tournamentCompetitors.find(
      (item) => item.fighter_id === fighterId && item.nomination_id === nominationId
    )

    if (competitor) {
      await competitionStore.deleteCompetitor(competitor.id)
    }
  }

  const createGroupBlock = () => {
    void competitionStore.createGroupBlock()
  }

  const createOlympicBlock = (includeThirdPlaces = false) => {
    void competitionStore.createOlympicBlock(includeThirdPlaces)
  }

  const updateFightScore = ({ fightId, fightNumber, scores }: FightScoreUpdatePayload) => {
    competitionStore.updateGlobalScore({
      fightId,
      fightNumber,
      roundScores: scores.roundScores,
      warnings: scores.warnings
    })
  }

  const updateGroups = (groups: Group[]) => {
    competitionStore.setGroups(groups)
  }

  const resolveTie = async (pendingTie: PendingTie, orderedCompetitorIds: number[]) => {
    await competitionStore.resolveTie(pendingTie, orderedCompetitorIds)
  }

  const swapOlympicSlots = async ({
    blockId,
    sourcePosition,
    targetPosition
  }: OlympicSlotSwapPayload) => {
    await competitionStore.swapBracketSlots(blockId, sourcePosition, targetPosition)
  }

  const setOlympicPairsFixing = (blockId: number, isFixing: boolean) => {
    if (isFixing) {
      olympicPairsFixingByBlockId[blockId] = true
      return
    }

    delete olympicPairsFixingByBlockId[blockId]
  }

  const getOlympicPairsFixing = (block: CompetitionBlock) =>
    Boolean(olympicPairsFixingByBlockId[block.id])

  const activeRedRollbackCompetitorNames = (competitors: ActiveRedRollbackCompetitor[]) =>
    competitors
      .map((fighter) =>
        [fighter.surname, fighter.name, fighter.patronymic]
          .filter((part): part is string => Boolean(part))
          .map((part) => tData(part, currentLanguage.value))
          .join(' ')
      )
      .join(', ')

  const requestActiveRedRollback = (details: ActiveRedRollbackDetails) => {
    requestBackwardConfirmation(
      translate('tournamentPageActiveRedRollbackWarning', {
        fighters: activeRedRollbackCompetitorNames(details.competitors)
      }),
      async () => {
        try {
          await competitionStore.rollback(details.block_id, undefined, true)
          if (!competitionStore.getBlocks.length) {
            setCurrentNominationOpen(true)
          }
        } finally {
          await refreshCardsAndCompetition()
        }
      }
    )
  }

  const fixOlympicPairs = async (blockId: number) => {
    if (olympicPairsFixingByBlockId[blockId]) return

    setOlympicPairsFixing(blockId, true)
    try {
      await competitionStore.generateOlympicFights(blockId)
    } catch (error: unknown) {
      const details = getActiveRedRollbackDetails(error)
      if (details) {
        requestActiveRedRollback(details)
        return
      }
      throw error
    } finally {
      setOlympicPairsFixing(blockId, false)
      await refreshCardsAndCompetition()
    }
  }

  const fixOlympicRoundResults = async ({
    blockId,
    round,
    fights
  }: OlympicRoundResultsPayload) => {
    try {
      await competitionStore.fixResults(blockId, fights, round)
    } finally {
      await refreshCardsAndCompetition()
    }
  }

  const cancelOlympicRoundResultsFixation = ({ blockId, round }: OlympicRoundPayload) => {
    requestBackwardConfirmation(translate('tournamentPageConfirmCancelResultsFixation'), async () => {
      try {
        await competitionStore.cancelResultsFixation(blockId, round)
      } finally {
        await refreshCardsAndCompetition()
      }
    })
  }

  const cancelOlympicPairFixation = ({ blockId, round }: OlympicRoundPayload) => {
    requestBackwardConfirmation(
      translate(
        'tournamentPageConfirmCancelPairFixation',
        getOlympicRoundDeletionCounts(blockId, round)
      ),
      async () => {
        try {
          await competitionStore.cancelFightsFixation(blockId, round)
        } finally {
          await refreshCardsAndCompetition()
        }
      }
    )
  }

  const rollbackOlympicRound = ({ blockId, round }: OlympicRoundPayload) => {
    requestBackwardConfirmation(
      translate(
        'tournamentPageConfirmReturnPreviousRound',
        getOlympicRoundDeletionCounts(blockId, round)
      ),
      async () => {
        try {
          await competitionStore.rollback(blockId, round)
        } finally {
          await refreshCardsAndCompetition()
        }
      }
    )
  }

  const rollbackOlympicPendingPairs = (blockId: number) => {
    const block = blocks.value.find((item) => item.id === blockId)
    const latestRoundState = block
      ? [...block.roundStates].sort((a, b) => b.round - a.round)[0]
      : undefined
    const round = latestRoundState?.round ?? 1
    const confirmationKey =
      latestRoundState?.round && latestRoundState.round > 1
        ? 'tournamentPageConfirmReturnPreviousRound'
        : 'tournamentPageConfirmReturnPreviousStage'

    requestBackwardConfirmation(
      translate(confirmationKey, getOlympicRoundDeletionCounts(blockId, round)),
      async () => {
        try {
          if (latestRoundState?.round && latestRoundState.round > 1) {
            await competitionStore.rollback(blockId, latestRoundState.round)
            return
          }

          await competitionStore.rollback(blockId)
        } finally {
          await refreshCardsAndCompetition()
        }
      }
    )
  }

  const createDisciplinaryCard = async (payload: CreateDisciplinaryCardPayload) => {
    return cardsStore.createCard(payload)
  }

  const updateDisciplinaryCard = async (
    id: number,
    payload: UpdateDisciplinaryCardPayload
  ) => {
    return cardsStore.updateCard(id, payload)
  }

  const deleteDisciplinaryCard = async (id: number) => {
    await cardsStore.deleteCard(id)
  }

  const generateGroupFights = async (blockId: number) => {
    try {
      await competitionStore.generateGroupFights(blockId)
    } catch (error: unknown) {
      const details = getActiveRedRollbackDetails(error)
      if (details) {
        requestActiveRedRollback(details)
        return
      }
      throw error
    } finally {
      await refreshCardsAndCompetition()
    }
  }

  const finishCompetition = async () => {
    try {
      await competitionStore.finishCompetition()
      const targetNom = tournament.value?.nominations.find(
        (nomination) => nomination.nomination_id === activeTab.value
      )
      if (targetNom) {
        targetNom.is_finished = true
        targetNom.is_open = false
      }
    } finally {
      await refreshCardsAndCompetition()
    }
  }

  const fixGroupResults = async (blockId: number) => {
    const block = blocks.value.find((item) => item.id === blockId)
    if (!block) return

    const incompleteFightNumbers = getIncompleteFightNumbers(block.fights)
    if (incompleteFightNumbers.length) {
      apiUiStore.setError(
        translate('tournamentPageIncompleteFightResults', {
          fights: incompleteFightNumbers.join(', ')
        })
      )
      return
    }

    try {
      await competitionStore.fixResults(blockId, block.fights)
    } catch (error: unknown) {
      const message = await getReportErrorMessage(error)
      apiUiStore.setError(message)
      console.error('Failed to fix group results:', message, error)
    } finally {
      await refreshCardsAndCompetition()
    }
  }

  const cancelGroupResultsFixation = (blockId: number) => {
    requestBackwardConfirmation(translate('tournamentPageConfirmCancelResultsFixation'), async () => {
      try {
        await competitionStore.cancelResultsFixation(blockId)
      } finally {
        await refreshCardsAndCompetition()
      }
    })
  }

  const cancelGroupFightsFixation = (blockId: number) => {
    requestBackwardConfirmation(
      translate('tournamentPageConfirmCancelGroupFixation', getBlockDeletionCounts(blockId)),
      async () => {
        try {
          await competitionStore.cancelFightsFixation(blockId)
        } finally {
          await refreshCardsAndCompetition()
        }
      }
    )
  }

  const rollbackBlock = (blockId: number) => {
    requestBackwardConfirmation(
      translate('tournamentPageConfirmReturnPreviousStage', getBlockDeletionCounts(blockId)),
      async () => {
        try {
          await competitionStore.rollback(blockId)
          if (!competitionStore.getBlocks.length) {
            setCurrentNominationOpen(true)
          }
        } finally {
          await refreshCardsAndCompetition()
        }
      }
    )
  }

  const blockTitle = (block: CompetitionBlock) => {
    const type =
      block.type === 'GROUP'
        ? translate('tournamentPageGroupBlosk')
        : translate('tournamentPageOlympicBlosk')
    return block.type === 'GROUP' ? `${type} ${block.stage}` : `${type}`
  }

  return {
    closeRegistration,
    openRegistration,
    removeCompetitor,
    createGroupBlock,
    createOlympicBlock,
    updateFightScore,
    updateGroups,
    resolveTie,
    swapOlympicSlots,
    fixOlympicPairs,
    fixOlympicRoundResults,
    cancelOlympicRoundResultsFixation,
    cancelOlympicPairFixation,
    rollbackOlympicRound,
    rollbackOlympicPendingPairs,
    generateGroupFights,
    finishCompetition,
    fixGroupResults,
    cancelGroupResultsFixation,
    cancelGroupFightsFixation,
    rollbackBlock,
    refreshCardsAndCompetition,
    createDisciplinaryCard,
    updateDisciplinaryCard,
    deleteDisciplinaryCard,
    blockTitle,
    getOlympicPairsFixing
  }
}
