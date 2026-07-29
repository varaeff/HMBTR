import { computed, onMounted, reactive, ref, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { useTranslation } from 'i18next-vue'
import http from '@/api/http'
import { useTournamentsListStore } from '@/stores/tournamentsList'
import { useFightersListStore } from '@/stores/fightersList'
import { useCommonDataStore } from '@/stores/commonData'
import { useCompetitionStore } from '@/stores/competition'
import { useApiUiStore } from '@/stores/apiUi'
import { useDisciplinaryCardsStore } from '@/stores/disciplinaryCards'
import { useTournamentMarshalsStore } from '@/stores/tournamentMarshals'
import { useCollapsiblePersist } from '@/composables/useCollapsiblePersist'
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
import { API_ROUTES } from '@shared/routes'
import type {
  CompetitionBlock,
  DisciplinaryCardStatus,
  Tournament
} from '@/model'

export interface TournamentBackwardConfirmation {
  mainText: string
  action: () => Promise<void>
}

interface ApiErrorWithResponse {
  response?: {
    data?: unknown
  }
  message?: string
}

interface ReportErrorData {
  details?: string[] | string | ActiveRedRollbackDetails
  error?: string
}

interface ActiveRedRollbackCompetitor {
  name: string
  surname: string
  patronymic?: string | null
}

interface ActiveRedRollbackDetails {
  code: 'ACTIVE_RED_CARD_COMPETITORS_REQUIRE_ROLLBACK'
  block_id: number
  competitors: ActiveRedRollbackCompetitor[]
}

const REPORT_DOWNLOAD_TIMEOUT_MS = 120000
const OLYMPIC_BRACKET_SIZES = [4, 8, 16] as const

const toDateInputValue = (date: Date) => {
  const parsed = new Date(date)
  const year = parsed.getUTCFullYear()
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
  const day = String(parsed.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const isReportErrorData = (value: unknown): value is ReportErrorData =>
  typeof value === 'object' && value !== null

const isActiveRedRollbackDetails = (value: unknown): value is ActiveRedRollbackDetails =>
  typeof value === 'object' &&
  value !== null &&
  'code' in value &&
  value.code === 'ACTIVE_RED_CARD_COMPETITORS_REQUIRE_ROLLBACK' &&
  'block_id' in value &&
  typeof value.block_id === 'number' &&
  'competitors' in value &&
  Array.isArray(value.competitors)

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
  const isReportDownloading = ref(false)
  const isCardsOpen = ref(true)
  const isMarshalRegistrationOpen = ref(false)
  const blockOpenStates = reactive<Record<string, boolean>>({})
  const backwardConfirmation = ref<TournamentBackwardConfirmation | null>(null)
  let nominationLoadRequestId = 0

  const currentLanguage = computed(() => i18next.language)
  const tournamentName = computed(() => tData(tournament.value?.name ?? '', currentLanguage.value))

  const tournamentDetails = computed(() => {
    if (!tournament.value) return ''
    return `${tData(tournament.value.country, currentLanguage.value)}, ${tData(tournament.value.city, currentLanguage.value)},
      ${dateToString(tournament.value.event_date)}`
  })

  const closeBackwardConfirmation = () => {
    backwardConfirmation.value = null
  }

  const requestBackwardConfirmation = (mainText: string, action: () => Promise<void>) => {
    backwardConfirmation.value = { mainText, action }
  }

  const runConfirmedBackwardAction = async () => {
    const action = backwardConfirmation.value?.action
    closeBackwardConfirmation()
    await action?.()
  }

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

  const cardIssueDate = computed(() =>
    tournament.value?.event_date
      ? toDateInputValue(tournament.value.event_date)
      : toDateInputValue(new Date())
  )

  const tournamentCardCheckDate = computed(() => {
    if (tournament.value?.event_date) return tournament.value.event_date
    return new Date()
  })

  const isCardActive = (receivedAt: string, expiresAt: string) => {
    const checkDate = new Date(tournamentCardCheckDate.value).setHours(0, 0, 0, 0)
    const received = new Date(receivedAt).setHours(0, 0, 0, 0)
    const expires = new Date(expiresAt).setHours(0, 0, 0, 0)

    return received <= checkDate && expires >= checkDate
  }

  const activeCardTypes = computed<Partial<Record<number, DisciplinaryCardStatus>>>(() => {
    const statuses: Partial<Record<number, DisciplinaryCardStatus>> = {}
    const priority = (status: DisciplinaryCardStatus) =>
      status.type === 'RED' ? (status.active ? 3 : 2) : 1

    for (const card of cardsStore.tournamentCards) {
      if (!isCardActive(card.received_at, card.expires_at)) continue
      if (card.type === 'YELLOW' && !card.active) continue
      const nextStatus: DisciplinaryCardStatus = {
        type: card.type,
        active: card.active
      }
      const currentStatus = statuses[card.fighter_id]
      if (!currentStatus || priority(nextStatus) > priority(currentStatus)) {
        statuses[card.fighter_id] = nextStatus
      }
    }

    return statuses
  })

  const getRedCardGroupFighterKeys = (block: CompetitionBlock) => {
    const keys = new Set<string>()

    for (const card of cardsStore.tournamentCards) {
      if (
        card.type !== 'RED' ||
        !card.active ||
        card.nomination_id !== activeTab.value ||
        card.fight_stage !== block.stage ||
        !card.group_name ||
        !isCardActive(card.received_at, card.expires_at)
      ) {
        continue
      }
      keys.add(`${card.group_name}:${card.fighter_id}`)
    }

    return keys
  }

  const activeGroupBlockComplete = computed(() => {
    if (!activeBlock.value || activeBlock.value.type !== 'GROUP') return false
    return areFightResultsReady(activeBlock.value.fights)
  })

  const activeGroupFightsGenerated = computed(() => {
    return Boolean(activeBlock.value?.type === 'GROUP' && activeBlock.value.fights.length > 0)
  })

  const attachedCardCountByFightId = computed<Record<number, number>>(() => {
    const counts: Record<number, number> = {}
    for (const card of cardsStore.tournamentCards) {
      counts[card.fight_id] = (counts[card.fight_id] ?? 0) + 1
    }
    return counts
  })

  const getBlockDeletionCounts = (blockId: number) => {
    const fights = blocks.value.find((block) => block.id === blockId)?.fights ?? []
    return {
      fights: fights.length,
      cards: fights.reduce(
        (total, fight) => total + (attachedCardCountByFightId.value[fight.id] ?? 0),
        0
      )
    }
  }

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

  const createGroupBlock = () => {
    competitionStore.createGroupBlock()
  }

  const createOlympicBlock = (includeThirdPlaces = false) => {
    competitionStore.createOlympicBlock(includeThirdPlaces)
  }

  const getActiveRedRollbackDetails = (error: unknown) => {
    const responseData = (error as ApiErrorWithResponse).response?.data

    if (!isReportErrorData(responseData)) return null
    return isActiveRedRollbackDetails(responseData.details) ? responseData.details : null
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

  const getReportErrorMessage = async (error: unknown) => {
    const responseData = (error as ApiErrorWithResponse).response?.data

    if (responseData instanceof Blob) {
      const text = await responseData.text()

      try {
        const parsed = JSON.parse(text) as ReportErrorData
        const details = Array.isArray(parsed.details)
          ? parsed.details.join(', ')
          : typeof parsed.details === 'string'
            ? parsed.details
            : undefined

        return details || parsed.error || text || 'Failed to download tournament report'
      } catch {
        return text || 'Failed to download tournament report'
      }
    }

    if (isReportErrorData(responseData)) {
      const details = Array.isArray(responseData.details)
        ? responseData.details.join(', ')
        : typeof responseData.details === 'string'
          ? responseData.details
          : undefined

      return details || responseData.error || 'Failed to download tournament report'
    }

    return (error as ApiErrorWithResponse).message || 'Failed to download tournament report'
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

  const getFileNameFromContentDisposition = (contentDisposition?: string) => {
    if (!contentDisposition) return `${tournamentName.value || 'tournament'}-results.pdf`

    const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/)
    if (encodedMatch?.[1]) {
      return decodeURIComponent(encodedMatch[1])
    }

    const plainMatch = contentDisposition.match(/filename="([^"]+)"/)
    return plainMatch?.[1] ?? `${tournamentName.value || 'tournament'}-results.pdf`
  }

  const downloadTournamentReport = async (language: 'en' | 'ru') => {
    if (!tournament.value || isReportDownloading.value) return

    isReportDownloading.value = true

    try {
      const { data, headers } = await http.get(API_ROUTES.TOURNAMENTS.REPORT(tournamentId.value), {
        params: { lang: language },
        responseType: 'blob',
        timeout: REPORT_DOWNLOAD_TIMEOUT_MS
      })
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')

      link.href = url
      link.download = getFileNameFromContentDisposition(headers['content-disposition'])
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      const message = await getReportErrorMessage(error)
      apiUiStore.setError(message)
      console.error('Failed to download tournament report:', message, error)
    } finally {
      isReportDownloading.value = false
    }
  }

  const blockTitle = (block: CompetitionBlock) => {
    const type =
      block.type === 'GROUP'
        ? i18next.t('tournamentPageGroupBlosk')
        : i18next.t('tournamentPageOlympicBlosk')
    return block.type === 'GROUP' ? `${type} ${block.stage}` : `${type}`
  }

  const blockStorageKey = (block: CompetitionBlock) =>
    `HMBTR-collapsible-competition-block-${tournamentId.value}-${activeTab.value}-${block.id}`

  const getBlockIsOpen = (block: CompetitionBlock) => {
    const key = blockStorageKey(block)

    if (!(key in blockOpenStates)) {
      const stored = localStorage.getItem(key)
      blockOpenStates[key] = stored === null ? true : stored === 'true'
    }

    return blockOpenStates[key]
  }

  const setBlockIsOpen = (block: CompetitionBlock, isOpen: boolean) => {
    const key = blockStorageKey(block)
    blockOpenStates[key] = isOpen
    localStorage.setItem(key, String(isOpen))
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
      openRegistration,
      createGroupBlock,
      createOlympicBlock,
      generateGroupFights,
      finishCompetition,
      fixGroupResults,
      cancelGroupResultsFixation,
      cancelGroupFightsFixation,
      rollbackBlock,
      refreshCardsAndCompetition,
      blockTitle,
      getBlockIsOpen,
      setBlockIsOpen,
      getRedCardGroupFighterKeys,
      downloadTournamentReport
    }
  }
}
