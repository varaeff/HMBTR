import { computed, onMounted, reactive, ref, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { useTranslation } from 'i18next-vue'
import { useTournamentsListStore } from '@/stores/tournamentsList'
import { useFightersListStore } from '@/stores/fightersList'
import { useCommonDataStore } from '@/stores/commonData'
import { useCompetitionStore } from '@/stores/competition'
import { useApiUiStore } from '@/stores/apiUi'
import { useDisciplinaryCardsStore } from '@/stores/disciplinaryCards'
import { useTournamentMarshalsStore } from '@/stores/tournamentMarshals'
import { useCollapsiblePersist } from '@/composables/useCollapsiblePersist'
import { useTournamentBackwardConfirmation } from '@/composables/useTournamentBackwardConfirmation'
import { useTournamentBlockOpenState } from '@/composables/useTournamentBlockOpenState'
import { useTournamentCardsState } from '@/composables/useTournamentCardsState'
import { useTournamentReportDownload } from '@/composables/useTournamentReportDownload'
import {
  type ActiveRedRollbackDetails,
  type ActiveRedRollbackCompetitor,
  getActiveRedRollbackDetails
} from '@/composables/tournamentPageErrors'
import { tData } from '@/lib/utils'
import { dateToString } from '@/lib/dateUtils'
import { hasAccess, hasAdminAccess, hasTournamentMarshalAccess } from '@/lib/checkAccess'
import {
  canShowAddJudgesButton as getCanShowAddJudgesButton,
  canShowTournamentMarshalSelector
} from '@/lib/tournamentMarshalRegistration'
import {
  areFightResultsReady,
  getIncompleteFightNumbers
} from '@/lib/fightResult'
import type {
  CompetitionBlock,
  CreateDisciplinaryCardPayload,
  FightData,
  Group,
  PendingTie,
  Tournament,
  UpdateDisciplinaryCardPayload
} from '@/model'
import type { FightWarning, RoundScore } from '@shared/fightScoring'

export type { TournamentBackwardConfirmation } from './useTournamentBackwardConfirmation'

interface FightScoreUpdatePayload {
  fightId: number
  fightNumber: number
  scores: {
    roundScores?: RoundScore[]
    warnings?: FightWarning[]
  }
}

interface OlympicSlotSwapPayload {
  blockId: number
  sourcePosition: number
  targetPosition: number
}

interface OlympicRoundPayload {
  blockId: number
  round: number
}

interface OlympicRoundResultsPayload extends OlympicRoundPayload {
  fights: FightData[]
}

const OLYMPIC_BRACKET_SIZES = [4, 8, 16] as const

export const useTournamentPage = (tournamentId: Ref<number>) => {
  const tournamentsListStore = useTournamentsListStore()
  const fightersListStore = useFightersListStore()
  const commonDataStore = useCommonDataStore()
  const competitionStore = useCompetitionStore()
  const apiUiStore = useApiUiStore()
  const cardsStore = useDisciplinaryCardsStore()
  const tournamentMarshalsStore = useTournamentMarshalsStore()
  const { i18next } = useTranslation()
  const route = useRoute()

  const tournament = ref<Tournament | null>(null)
  const activeTab = ref<number>(0)
  const canEdit = hasAccess()
  const canDeleteCards = Boolean(hasAdminAccess())
  const isNominationLoading = ref(false)
  const isCardsOpen = ref(true)
  const isMarshalRegistrationOpen = ref(false)
  const olympicPairsFixingByBlockId = reactive<Record<number, boolean>>({})
  const {
    confirmation: backwardConfirmation,
    close: closeBackwardConfirmation,
    request: requestBackwardConfirmation,
    runConfirmed: runConfirmedBackwardAction
  } = useTournamentBackwardConfirmation()
  const { getBlockIsOpen, setBlockIsOpen } = useTournamentBlockOpenState(tournamentId, activeTab)
  let nominationLoadRequestId = 0

  const currentLanguage = computed(() => i18next.language)
  const tournamentName = computed(() => tData(tournament.value?.name ?? '', currentLanguage.value))

  const tournamentDetails = computed(() => {
    if (!tournament.value) return ''
    return `${tData(tournament.value.country, currentLanguage.value)}, ${tData(tournament.value.city, currentLanguage.value)},
      ${dateToString(tournament.value.event_date)}`
  })
  const {
    isDownloading: isReportDownloading,
    getReportErrorMessage,
    download: downloadTournamentReport
  } = useTournamentReportDownload({
    tournamentId,
    tournamentName,
    apiUiStore,
    hasTournament: () => Boolean(tournament.value)
  })

  const getRouteNominationId = () => {
    const rawNomination = route.query.nomination
    const nominationValue = Array.isArray(rawNomination) ? rawNomination[0] : rawNomination
    const parsed = Number(nominationValue)

    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  }

  const loadNominationData = async (nomId: number) => {
    const requestId = ++nominationLoadRequestId

    isNominationLoading.value = true
    competitionStore.resetCompetitionState()
    competitionStore.setTournamentAndNomination(tournamentId.value, nomId)

    try {
      await competitionStore.setCompetitors()
      if (requestId !== nominationLoadRequestId) return

      await competitionStore.loadCompetitionState()
    } finally {
      if (requestId === nominationLoadRequestId) {
        isNominationLoading.value = false
      }
    }
  }

  const isCompetitorsListOpen = useCollapsiblePersist(
    'competitors',
    computed(() => `${tournamentId.value}-${activeTab.value}`)
  )

  const tournamentNominations = computed(() => {
    const tNoms = tournament.value?.nominations
    if (!tNoms || !commonDataStore.nominations.length) return { all: [], open: [] }

    const statusMap = new Map(tNoms.map((n) => [n.nomination_id, n.is_open]))

    const all = commonDataStore.nominations
      .filter((n) => statusMap.has(n.id))
      .sort((a, b) => a.id - b.id)

    return { all, open: all.filter((n) => statusMap.get(n.id)) }
  })

  const currentTournamentNomination = computed(() =>
    tournament.value?.nominations.find((n) => n.nomination_id === activeTab.value)
  )

  const isCurrentNominationOpen = computed(() =>
    competitionStore.getIsRegistrationOpen === null
      ? tournamentNominations.value.open.some((n) => n.id === activeTab.value)
      : competitionStore.getIsRegistrationOpen
  )

  const nominationCompetitors = computed(() => competitionStore.getNominationFighters)
  const blocks = computed(() => competitionStore.getBlocks)
  const activeBlock = computed(() => competitionStore.getActiveBlock)
  const placements = computed(() => competitionStore.getPlacements)
  const pendingTie = computed(() => competitionStore.getPendingTie)
  const tournamentCards = computed(() => cardsStore.tournamentCards)
  const tournamentMarshals = computed(() => tournamentMarshalsStore.tournamentMarshals)
  const {
    cardIssueDate,
    activeCardTypes,
    attachedCardCountByFightId,
    getRedCardGroupFighterKeys,
    getBlockDeletionCounts,
    getOlympicRoundDeletionCounts
  } = useTournamentCardsState({
    tournament,
    activeTab,
    blocks,
    cardsStore
  })
  const hasBlockingGroupAdvancementTie = computed(
    () => Boolean(pendingTie.value) && pendingTie.value?.scope !== 'OLYMPIC_THIRD'
  )
  const olympicCompetitorIds = computed(
    () =>
      new Set(
        blocks.value
          .filter((block) => block.type === 'OLYMPIC')
          .flatMap((block) => block.bracketSlots.map((slot) => slot.competitorId))
      )
  )
  const nominationFinished = computed(
    () => competitionStore.getIsFinished || Boolean(currentTournamentNomination.value?.is_finished)
  )
  const allTournamentNominationsFinished = computed(
    () =>
      Boolean(tournament.value?.nominations.length) &&
      tournament.value!.nominations.every((nomination) => nomination.is_finished)
  )

  const canEditCompetition = computed(() => canEdit && !nominationFinished.value)
  const canUseCompetitionBackwardActions = computed(() => canEdit)
  const canManageCards = computed(() => canEdit || hasTournamentMarshalAccess())
  const canManageTournamentMarshals = computed(() => hasTournamentMarshalAccess())
  const hasOpenFighterRegistration = computed(() => tournamentNominations.value.open.length > 0)
  const hasTournamentMarshals = computed(() => tournamentMarshalsStore.tournamentMarshals.length > 0)
  const marshalRegistrationState = computed(() => ({
    canManageTournamentMarshals: canManageTournamentMarshals.value,
    hasOpenFighterRegistration: hasOpenFighterRegistration.value,
    hasTournamentMarshals: hasTournamentMarshals.value,
    isMarshalRegistrationOpen: isMarshalRegistrationOpen.value,
    isMarshalsRegistrationClosed: Boolean(tournament.value?.is_marshals_registration_closed)
  }))
  const canShowAddJudgesButton = computed(() =>
    getCanShowAddJudgesButton(marshalRegistrationState.value)
  )
  const showTournamentMarshalSelector = computed(() =>
    canShowTournamentMarshalSelector(marshalRegistrationState.value)
  )

  const activeGroupBlockComplete = computed(() => {
    if (!activeBlock.value || activeBlock.value.type !== 'GROUP') return false
    return areFightResultsReady(activeBlock.value.fights)
  })

  const activeGroupFightsGenerated = computed(() => {
    return Boolean(activeBlock.value?.type === 'GROUP' && activeBlock.value.fights.length > 0)
  })


  const activeOlympicFinalResultsFixed = computed(() => {
    if (!activeBlock.value || activeBlock.value.type !== 'OLYMPIC') return false
    const finalRound = Math.log2(activeBlock.value.bracketSlots.length)
    return Boolean(
      activeBlock.value.roundStates.find((state) => state.round === finalRound)?.resultsFixed
    )
  })

  const canGenerateGroupFights = computed(() => {
    if (!activeBlock.value || activeBlock.value.type !== 'GROUP' || activeGroupFightsGenerated.value)
      return false
    return (
      activeBlock.value.groups.length > 0 &&
      activeBlock.value.groups.every((group) => group.fighters.length > 2)
    )
  })

  const activeAdvancerCount = computed(() => {
    if (!activeBlock.value || activeBlock.value.type !== 'GROUP') return 0
    if (!activeGroupBlockComplete.value || hasBlockingGroupAdvancementTie.value) return 0
    return activeBlock.value.groups.length === 1
      ? activeBlock.value.groups[0].fighters.length
      : activeBlock.value.groups.length * 2
  })

  const canOfferOlympic = computed(() =>
    [4, 8, 16].includes(activeAdvancerCount.value || nominationCompetitors.value.length)
  )

  const nextOlympicBracketSize = computed(() => {
    const competitorCount = activeAdvancerCount.value
    if (!competitorCount) return null

    return OLYMPIC_BRACKET_SIZES.find((size) => size >= competitorCount) ?? null
  })

  const olympicBracketShortfall = computed(() => {
    const targetSize = nextOlympicBracketSize.value
    if (!targetSize || targetSize === activeAdvancerCount.value) return 0

    return targetSize - activeAdvancerCount.value
  })

  const activeThirdPlaceCount = computed(() => {
    if (!activeBlock.value || activeBlock.value.type !== 'GROUP') return 0
    if (!activeGroupBlockComplete.value || hasBlockingGroupAdvancementTie.value) return 0
    if (activeBlock.value.groups.length < 2) return 0

    return activeBlock.value.groups.filter((group) => group.fighters.length >= 3).length
  })

  const canOfferOlympicWithThirdPlaces = computed(
    () =>
      !canOfferOlympic.value &&
      pendingTie.value?.scope !== 'OLYMPIC_THIRD' &&
      olympicBracketShortfall.value > 0 &&
      activeThirdPlaceCount.value >= olympicBracketShortfall.value
  )

  const closeRegistration = async () => {
    if (!hasTournamentMarshals.value) {
      apiUiStore.setError(i18next.t('tournamentPageAddJudgesHint'))
      return
    }
    await tournamentsListStore.updateTournamentNomination(tournamentId.value, activeTab.value, false)
    competitionStore.setRegistrationOpen(false)
    const targetNom = tournament.value?.nominations.find((n) => n.nomination_id === activeTab.value)

    if (targetNom) {
      targetNom.is_open = false
    }
  }

  const openRegistration = async () => {
    await tournamentsListStore.updateTournamentNomination(tournamentId.value, activeTab.value, true)
    competitionStore.setRegistrationOpen(true)
    const targetNom = tournament.value?.nominations.find((n) => n.nomination_id === activeTab.value)

    if (targetNom) {
      targetNom.is_open = true
    }
  }

  const setActiveTab = (value: number) => {
    activeTab.value = value
  }

  const setCompetitorsListOpen = (value: boolean) => {
    isCompetitorsListOpen.value = value
  }

  const setCardsOpen = (value: boolean) => {
    isCardsOpen.value = value
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
    competitionStore.createGroupBlock()
  }

  const createOlympicBlock = (includeThirdPlaces = false) => {
    competitionStore.createOlympicBlock(includeThirdPlaces)
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
    requestBackwardConfirmation(i18next.t('tournamentPageConfirmCancelResultsFixation'), async () => {
      try {
        await competitionStore.cancelResultsFixation(blockId, round)
      } finally {
        await refreshCardsAndCompetition()
      }
    })
  }

  const cancelOlympicPairFixation = ({ blockId, round }: OlympicRoundPayload) => {
    requestBackwardConfirmation(
      i18next.t('tournamentPageConfirmCancelPairFixation', getOlympicRoundDeletionCounts(blockId, round)),
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
      i18next.t('tournamentPageConfirmReturnPreviousRound', getOlympicRoundDeletionCounts(blockId, round)),
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
      i18next.t(confirmationKey, getOlympicRoundDeletionCounts(blockId, round)),
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

  const activeRedRollbackCompetitorNames = (competitors: ActiveRedRollbackCompetitor[]) =>
    competitors
      .map((fighter) =>
        [fighter.surname, fighter.name, fighter.patronymic]
          .filter((part): part is string => Boolean(part))
          .map((part) => tData(part, currentLanguage.value))
          .join(' ')
      )
      .join(', ')

  const refreshCardsAndCompetition = async () => {
    await cardsStore.loadTournamentCards(tournamentId.value)
    await competitionStore.setCompetitors()
    if (activeTab.value) {
      await competitionStore.loadCompetitionState()
    }
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

  const requestActiveRedRollback = (details: ActiveRedRollbackDetails) => {
    requestBackwardConfirmation(
      i18next.t('tournamentPageActiveRedRollbackWarning', {
        fighters: activeRedRollbackCompetitorNames(details.competitors)
      }),
      async () => {
        try {
          await competitionStore.rollback(details.block_id, undefined, true)
          const targetNom = tournament.value?.nominations.find(
            (n) => n.nomination_id === activeTab.value
          )
          if (targetNom && !competitionStore.getBlocks.length) {
            targetNom.is_open = true
          }
        } finally {
          await refreshCardsAndCompetition()
        }
      }
    )
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
      const targetNom = tournament.value?.nominations.find((n) => n.nomination_id === activeTab.value)
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
        i18next.t('tournamentPageIncompleteFightResults', {
          fights: incompleteFightNumbers.join(', ')
        })
      )
      return
    }

    try {
      await competitionStore.fixResults(blockId, block.fights)
    } catch (error) {
      const message = await getReportErrorMessage(error)
      apiUiStore.setError(message)
      console.error('Failed to fix group results:', message, error)
    } finally {
      await refreshCardsAndCompetition()
    }
  }

  const cancelGroupResultsFixation = async (blockId: number) => {
    requestBackwardConfirmation(i18next.t('tournamentPageConfirmCancelResultsFixation'), async () => {
      try {
        await competitionStore.cancelResultsFixation(blockId)
      } finally {
        await refreshCardsAndCompetition()
      }
    })
  }

  const cancelGroupFightsFixation = async (blockId: number) => {
    requestBackwardConfirmation(
      i18next.t('tournamentPageConfirmCancelGroupFixation', getBlockDeletionCounts(blockId)),
      async () => {
        try {
          await competitionStore.cancelFightsFixation(blockId)
        } finally {
          await refreshCardsAndCompetition()
        }
      }
    )
  }

  const rollbackBlock = async (blockId: number) => {
    requestBackwardConfirmation(
      i18next.t('tournamentPageConfirmReturnPreviousStage', getBlockDeletionCounts(blockId)),
      async () => {
        try {
          await competitionStore.rollback(blockId)
          const targetNom = tournament.value?.nominations.find(
            (n) => n.nomination_id === activeTab.value
          )
          if (targetNom && !competitionStore.getBlocks.length) {
            targetNom.is_open = true
          }
        } finally {
          await refreshCardsAndCompetition()
        }
      }
    )
  }

  const startMarshalRegistration = () => {
    isMarshalRegistrationOpen.value = true
  }

  const finishMarshalRegistration = () => {
    if (tournament.value) {
      tournament.value.is_marshals_registration_closed = true
    }
    isMarshalRegistrationOpen.value = false
  }

  const blockTitle = (block: CompetitionBlock) => {
    const type =
      block.type === 'GROUP'
        ? i18next.t('tournamentPageGroupBlosk')
        : i18next.t('tournamentPageOlympicBlosk')
    return block.type === 'GROUP' ? `${type} ${block.stage}` : `${type}`
  }

  onMounted(async () => {
    const [, fetchedTournament] = await Promise.all([
      commonDataStore.fetchNominations(),
      tournamentsListStore.showTournamentDetails(tournamentId.value),
      fightersListStore.getFightersList(),
      cardsStore.loadTournamentCards(tournamentId.value),
      tournamentMarshalsStore.loadTournamentMarshals(tournamentId.value)
    ])

    tournament.value = fetchedTournament
  })

  watch(activeTab, (newVal) => {
    if (newVal) loadNominationData(newVal)
  })

  watch(nominationFinished, (isFinished) => {
    const targetNom = currentTournamentNomination.value

    if (isFinished && targetNom) {
      targetNom.is_finished = true
      targetNom.is_open = false
    }
  })

  watch(
    () => competitionStore.getIsRegistrationOpen,
    (isOpen) => {
      if (isOpen === null) return
      const targetNom = currentTournamentNomination.value
      if (targetNom) targetNom.is_open = isOpen
    }
  )

  watch(tournamentNominations, (noms) => {
    if (noms.all.length && !activeTab.value) {
      const routeNominationId = getRouteNominationId()
      activeTab.value =
        routeNominationId && noms.all.some((nomination) => nomination.id === routeNominationId)
          ? routeNominationId
          : noms.all[0].id
    }
  })

  watch(hasOpenFighterRegistration, (hasOpen) => {
    if (!hasOpen) {
      isMarshalRegistrationOpen.value = false
    }
  })

  watch(
    () => route.query.nomination,
    () => {
      const routeNominationId = getRouteNominationId()

      if (
        routeNominationId &&
        routeNominationId !== activeTab.value &&
        tournamentNominations.value.all.some((nomination) => nomination.id === routeNominationId)
      ) {
        activeTab.value = routeNominationId
      }
    }
  )

  return {
    tournament: reactive({
      data: tournament,
      id: tournamentId,
      name: tournamentName,
      details: tournamentDetails
    }),
    nomination: reactive({
      activeTab,
      tournamentNominations,
      currentTournamentNomination,
      isCurrentNominationOpen,
      nominationCompetitors,
      nominationFinished,
      allTournamentNominationsFinished,
      isNominationLoading,
      isCompetitorsListOpen
    }),
    permissions: reactive({
      canEdit,
      canDeleteCards,
      canEditCompetition,
      canUseCompetitionBackwardActions,
      canManageCards,
      canManageTournamentMarshals
    }),
    marshalRegistration: reactive({
      hasTournamentMarshals,
      canShowAddJudgesButton,
      showTournamentMarshalSelector,
      tournamentMarshals
    }),
    cards: reactive({
      tournamentCards,
      isCardsOpen,
      activeCardTypes,
      cardIssueDate,
      attachedCardCountByFightId
    }),
    competition: reactive({
      blocks,
      activeBlock,
      placements,
      pendingTie,
      hasBlockingGroupAdvancementTie,
      olympicCompetitorIds,
      activeOlympicFinalResultsFixed,
      canGenerateGroupFights,
      canOfferOlympic,
      canOfferOlympicWithThirdPlaces
    }),
    report: reactive({
      isDownloading: isReportDownloading
    }),
    backwardConfirmation: reactive({
      confirmation: backwardConfirmation
    }),
    actions: {
      closeBackwardConfirmation,
      runConfirmedBackwardAction,
      startMarshalRegistration,
      finishMarshalRegistration,
      closeRegistration,
      setActiveTab,
      setCompetitorsListOpen,
      setCardsOpen,
      removeCompetitor,
      openRegistration,
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
      getBlockIsOpen,
      getOlympicPairsFixing,
      setBlockIsOpen,
      getRedCardGroupFighterKeys,
      downloadTournamentReport
    }
  }
}

export type TournamentPageState = ReturnType<typeof useTournamentPage>
