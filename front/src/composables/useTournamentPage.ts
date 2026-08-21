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
import { useTournamentCompetitionActions } from '@/composables/useTournamentCompetitionActions'
import { useTournamentCompetitionState } from '@/composables/useTournamentCompetitionState'
import { useTournamentReportDownload } from '@/composables/useTournamentReportDownload'
import { tData } from '@/lib/utils'
import { dateToString } from '@/lib/dateUtils'
import { hasAccess, hasMarshalManageAccess, hasTournamentMarshalAccess } from '@/lib/checkAccess'
import {
  canShowAddJudgesButton as getCanShowAddJudgesButton,
  canShowTournamentMarshalSelector
} from '@/lib/tournamentMarshalRegistration'
import type { Tournament } from '@/model'

export type { TournamentBackwardConfirmation } from './useTournamentBackwardConfirmation'

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
  const canDeleteCards = Boolean(hasTournamentMarshalAccess())
  const isNominationLoading = ref(false)
  const isMarshalRegistrationOpen = ref(false)
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

  const isCompetitorsListOpen = useCollapsiblePersist(
    'competitors',
    computed(() => `${tournamentId.value}-${activeTab.value}`),
    computed(() => !Boolean(currentTournamentNomination.value?.is_finished))
  )

  const isCurrentNominationOpen = computed(() =>
    competitionStore.getIsRegistrationOpen === null
      ? tournamentNominations.value.open.some((n) => n.id === activeTab.value)
      : competitionStore.getIsRegistrationOpen
  )

  const {
    nominationCompetitors,
    blocks,
    activeBlock,
    placements,
    pendingTie,
    hasBlockingGroupAdvancementTie,
    olympicCompetitorIds,
    nominationFinished,
    allTournamentNominationsFinished,
    activeOlympicFinalResultsFixed,
    canGenerateGroupFights,
    canOfferOlympic,
    canOfferOlympicWithThirdPlaces
  } = useTournamentCompetitionState({
    tournament,
    currentTournamentNomination,
    competitionStore
  })
  const tournamentCards = computed(() => cardsStore.tournamentCards)
  const tournamentActiveCards = computed(() => cardsStore.tournamentActiveCards)
  const tournamentMarshals = computed(() => tournamentMarshalsStore.tournamentMarshals)
  const isCardsOpen = useCollapsiblePersist(
    'cards',
    computed(() => tournamentId.value),
    computed(() => !allTournamentNominationsFinished.value)
  )
  const isJudgingCorpsOpen = useCollapsiblePersist(
    'judging-corps',
    computed(() => tournamentId.value),
    computed(() => !allTournamentNominationsFinished.value)
  )
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

  const canEditCompetition = computed(() => canEdit && !nominationFinished.value)
  const canUseCompetitionBackwardActions = computed(() => canEdit)
  const canManageCards = computed(() => hasMarshalManageAccess())
  const canCalculateRussiaHmbRating = computed(() => hasMarshalManageAccess())
  const canIssueCards = computed(() => hasTournamentMarshalAccess())
  const canManageTournamentMarshals = computed(() => hasTournamentMarshalAccess())
  const hasOpenFighterRegistration = computed(() => tournamentNominations.value.open.length > 0)
  const hasTournamentMarshals = computed(() => tournamentMarshalsStore.tournamentMarshals.length > 0)
  const hasChiefJudge = computed(() =>
    tournamentMarshalsStore.tournamentMarshals.some((marshal) => marshal.is_chief_judge)
  )
  const hasTournamentSecretary = computed(() => Boolean(tournament.value?.secretary_name?.trim()))
  const canCloseRegistration = computed(
    () => hasTournamentMarshals.value && hasChiefJudge.value && hasTournamentSecretary.value
  )
  const closeRegistrationHint = computed(() => {
    if (!hasTournamentMarshals.value) return i18next.t('tournamentPageAddJudgesHint')
    if (!hasChiefJudge.value) return i18next.t('tournamentPageSelectChiefJudgeHint')
    if (!hasTournamentSecretary.value) return i18next.t('tournamentPageAddSecretaryHint')
    return ''
  })
  const marshalRegistrationState = computed(() => ({
    canManageTournamentMarshals: canManageTournamentMarshals.value,
    hasOpenFighterRegistration: hasOpenFighterRegistration.value,
    isMarshalRegistrationOpen: isMarshalRegistrationOpen.value
  }))
  const canShowAddJudgesButton = computed(() =>
    getCanShowAddJudgesButton(marshalRegistrationState.value)
  )
  const showTournamentMarshalSelector = computed(() =>
    canShowTournamentMarshalSelector(marshalRegistrationState.value)
  )

  const setActiveTab = (value: number) => {
    activeTab.value = value
  }

  const setCompetitorsListOpen = (value: boolean) => {
    isCompetitorsListOpen.value = value
  }

  const setCardsOpen = (value: boolean) => {
    isCardsOpen.value = value
  }

  const setJudgingCorpsOpen = (value: boolean) => {
    isJudgingCorpsOpen.value = value
  }

  const collapseCurrentNominationSections = () => {
    setCompetitorsListOpen(false)
    blocks.value.forEach((block) => {
      setBlockIsOpen(block, false)
    })
  }

  const collapseTournamentSections = () => {
    setCardsOpen(false)
    setJudgingCorpsOpen(false)
  }

  const competitionActions = useTournamentCompetitionActions({
    tournamentId,
    tournament,
    activeTab,
    blocks,
    currentLanguage,
    canCloseRegistration,
    closeRegistrationHint,
    tournamentsListStore,
    competitionStore,
    apiUiStore,
    cardsStore,
    translate: i18next.t.bind(i18next),
    requestBackwardConfirmation,
    getReportErrorMessage,
    getBlockDeletionCounts,
    getOlympicRoundDeletionCounts,
    onNominationFinished: collapseCurrentNominationSections,
    onTournamentFinished: collapseTournamentSections
  })

  const startMarshalRegistration = () => {
    isMarshalRegistrationOpen.value = true
  }

  const updateTournamentSecretary = async (secretaryName: string) => {
    await tournamentMarshalsStore.updateTournamentSecretary(secretaryName)

    if (tournament.value) {
      const normalizedName = secretaryName.trim()
      tournament.value.secretary_name = normalizedName || null
    }
  }

  onMounted(async () => {
    const [, fetchedTournament] = await Promise.all([
      commonDataStore.fetchNominations(),
      tournamentsListStore.showTournamentDetails(tournamentId.value),
      fightersListStore.getFightersList(),
      cardsStore.loadTournamentCards(tournamentId.value),
      cardsStore.loadTournamentActiveCards(tournamentId.value),
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
      canCalculateRussiaHmbRating,
      canIssueCards,
      canManageTournamentMarshals
    }),
    marshalRegistration: reactive({
      hasOpenFighterRegistration,
      hasTournamentMarshals,
      hasChiefJudge,
      hasTournamentSecretary,
      canCloseRegistration,
      closeRegistrationHint,
      canShowAddJudgesButton,
      showTournamentMarshalSelector,
      tournamentMarshals,
      isJudgingCorpsOpen
    }),
    cards: reactive({
      tournamentCards,
      tournamentActiveCards,
      isCardsOpen,
      activeCardTypes,
      cardIssueDate,
      attachedCardCountByFightId
    }),
    competition: reactive({
      blocks,
      activeBlock,
      placements,
      russiaHmbRating: computed(() => competitionStore.getRussiaHmbRating),
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
      updateTournamentSecretary,
      setJudgingCorpsOpen,
      setActiveTab,
      setCompetitorsListOpen,
      setCardsOpen,
      ...competitionActions,
      calculateRussiaHmbRating: async (coefficient: 1 | 2 | 4) => {
        await competitionStore.calculateRussiaHmbRating(coefficient)
      },
      getBlockIsOpen,
      setBlockIsOpen,
      getRedCardGroupFighterKeys,
      downloadTournamentReport
    }
  }
}

export type TournamentPageState = ReturnType<typeof useTournamentPage>
