<script setup lang="ts">
import { ref, watch, onMounted, computed, reactive } from 'vue'
import { useTranslation } from 'i18next-vue'
import { useRoute } from 'vue-router'
import { Download } from 'lucide-vue-next'

import http from '@/api/http'
import { useTournamentsListStore } from '@/stores/tournamentsList'
import { useFightersListStore } from '@/stores/fightersList'
import { useCommonDataStore } from '@/stores/commonData'
import { useCompetitionStore } from '@/stores/competition'
import { useApiUiStore } from '@/stores/apiUi'
import { useDisciplinaryCardsStore } from '@/stores/disciplinaryCards'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

import { FightsDisplay } from '@/widgets/FightsDisplay'
import { FightersSelect } from '@/widgets/FightersSelect'
import { NominationCompetitors } from '@/widgets/NominationCompetitors'
import { NominationGroups } from '@/widgets/NominationGroups'
import { CollapsibleSection } from '@/widgets/CollapsibleSection'
import { OlympicBracket } from '@/widgets/OlympicBracket'
import { TieResolver } from '@/widgets/TieResolver'
import { CompetitionPodium } from '@/widgets/CompetitionPodium'
import { TournamentCardsTable } from '@/widgets/DisciplinaryCards'
import { TournamentMarshals } from '@/widgets/TournamentMarshals'
import { AlertWidget } from '@/widgets/AlertWidget'

import { useCollapsiblePersist } from '@/composables/useCollapsiblePersist'
import { tData } from '@/lib/utils'
import { dateToString } from '@/lib/dateUtils'
import { hasAccess, hasAdminAccess, hasTournamentMarshalAccess } from '@/lib/checkAccess'
import { API_ROUTES } from '@shared/routes'

import type { CompetitionBlock, DisciplinaryCardType, Tournament } from '@/model'

const props = defineProps<{
  id: string
}>()

const TournamentsListStore = useTournamentsListStore()
const FightersListStore = useFightersListStore()
const commonDataStore = useCommonDataStore()
const competitionStore = useCompetitionStore()
const apiUiStore = useApiUiStore()
const cardsStore = useDisciplinaryCardsStore()
const { i18next } = useTranslation()
const route = useRoute()

const tournamentId = computed(() => +props.id)
const tournament = ref<Tournament | null>(null)

const activeTab = ref<number>(0)
const canEdit = hasAccess()
const canDeleteCards = Boolean(hasAdminAccess())
const isNominationLoading = ref(false)
const isReportDownloading = ref(false)
const isCardsOpen = ref(true)
const isMarshalRegistrationOpen = ref(false)
const blockOpenStates = reactive<Record<string, boolean>>({})
let nominationLoadRequestId = 0
const REPORT_DOWNLOAD_TIMEOUT_MS = 120000
const OLYMPIC_BRACKET_SIZES = [4, 8, 16] as const
const backwardConfirmation = ref<{
  mainText: string
  action: () => Promise<void>
} | null>(null)

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

const currentLanguage = computed(() => i18next.language)
const tournamentName = computed(() => tData(tournament.value?.name ?? '', currentLanguage.value))

const tournamentDetails = computed(() => {
  if (!tournament.value) return ''
  return `${tData(tournament.value.country, currentLanguage.value)}, ${tData(tournament.value.city, currentLanguage.value)},
      ${dateToString(tournament.value.event_date)}`
})

const nominationCompetitors = computed(() => competitionStore.getNominationFighters)
const blocks = computed(() => competitionStore.getBlocks)
const activeBlock = computed(() => competitionStore.getActiveBlock)
const placements = computed(() => competitionStore.getPlacements)
const pendingTie = computed(() => competitionStore.getPendingTie)
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
const canManageCards = computed(() => canEdit)
const canManageTournamentMarshals = computed(() => hasTournamentMarshalAccess())
const hasOpenFighterRegistration = computed(() => tournamentNominations.value.open.length > 0)
const canShowAddJudgesButton = computed(
  () =>
    canManageTournamentMarshals.value &&
    hasOpenFighterRegistration.value &&
    !tournament.value?.is_marshals_registration_closed &&
    !isMarshalRegistrationOpen.value
)

const toDateInputValue = (date: Date) => {
  const parsed = new Date(date)
  const year = parsed.getUTCFullYear()
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
  const day = String(parsed.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

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

const activeCardTypes = computed<Partial<Record<number, DisciplinaryCardType>>>(() => {
  const statuses: Partial<Record<number, DisciplinaryCardType>> = {}

  for (const card of cardsStore.tournamentCards) {
    if (!isCardActive(card.received_at, card.expires_at)) continue
    if (card.type === 'RED' || statuses[card.fighter_id] !== 'RED') {
      statuses[card.fighter_id] = card.type
    }
  }

  return statuses
})

const activeGroupBlockComplete = computed(() => {
  if (!activeBlock.value || activeBlock.value.type !== 'GROUP') return false
  return (
    activeBlock.value.fights.length > 0 &&
    activeBlock.value.fights.every(
      (fight) =>
        !(fight.fighter1Score === 0 && fight.fighter2Score === 0) &&
        fight.fighter1Score !== fight.fighter2Score
    )
  )
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
  await TournamentsListStore.updateTournamentNomination(tournamentId.value, activeTab.value, false)
  competitionStore.setRegistrationOpen(false)
  const targetNom = tournament.value?.nominations.find((n) => n.nomination_id === activeTab.value)

  if (targetNom) {
    targetNom.is_open = false
  }
}

const createGroupBlock = () => {
  competitionStore.createGroupBlock()
}

const createOlympicBlock = (includeThirdPlaces = false) => {
  competitionStore.createOlympicBlock(includeThirdPlaces)
}

const generateGroupFights = async (blockId: number) => {
  try {
    await competitionStore.generateGroupFights(blockId)
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
  try {
    await competitionStore.fixResults(blockId, block.fights)
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

interface ApiErrorWithResponse {
  response?: {
    data?: unknown
  }
  message?: string
}

interface ReportErrorData {
  details?: string[] | string
  error?: string
}

const isReportErrorData = (value: unknown): value is ReportErrorData =>
  typeof value === 'object' && value !== null

const getReportErrorMessage = async (error: unknown) => {
  const responseData = (error as ApiErrorWithResponse).response?.data

  if (responseData instanceof Blob) {
    const text = await responseData.text()

    try {
      const parsed = JSON.parse(text) as ReportErrorData
      const details = Array.isArray(parsed.details) ? parsed.details.join(', ') : parsed.details

      return details || parsed.error || text || 'Failed to download tournament report'
    } catch {
      return text || 'Failed to download tournament report'
    }
  }

  if (isReportErrorData(responseData)) {
    const details = Array.isArray(responseData.details)
      ? responseData.details.join(', ')
      : responseData.details

    return details || responseData.error || 'Failed to download tournament report'
  }

  return (error as ApiErrorWithResponse).message || 'Failed to download tournament report'
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

const refreshCardsAndCompetition = async () => {
  await cardsStore.loadTournamentCards(tournamentId.value)
  await competitionStore.setCompetitors()
  if (activeTab.value) {
    await competitionStore.loadCompetitionState()
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
    TournamentsListStore.showTournamentDetails(tournamentId.value),
    FightersListStore.getFightersList(),
    cardsStore.loadTournamentCards(tournamentId.value)
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
</script>

<template>
  <Teleport to="body">
    <AlertWidget
      v-if="backwardConfirmation"
      class="fixed inset-0 z-99999 flex items-center justify-center"
      :isError="false"
      :title="$t('tournamentPageBackwardConfirmationTitle')"
      :mainText="backwardConfirmation.mainText"
      :showInput="false"
      :buttonAction="runConfirmedBackwardAction"
      :closeAction="closeBackwardConfirmation"
      :cancelAction="closeBackwardConfirmation"
      :buttonText="$t('tournamentPageConfirmBackwardAction')"
      :cancelText="$t('fighterPageCancelButton')"
      buttonVariant="destructive"
    />
  </Teleport>

  <div class="flex flex-col justify-center items-center mb-5" v-if="tournament">
    <h1 class="mb-4">{{ tournamentName }}</h1>
    <div v-if="tournament.id !== 0">
      {{ tournamentDetails }}
    </div>
    <div v-if="canShowAddJudgesButton" class="mt-4">
      <Button @click="startMarshalRegistration">{{ $t('tournamentPageAddJudgesButton') }}</Button>
    </div>
    <div v-if="canEdit && allTournamentNominationsFinished" class="mt-4 flex flex-wrap gap-3">
      <Button :disabled="isReportDownloading" @click="downloadTournamentReport('en')">
        <Download class="size-4" />
        PDF EN
      </Button>
      <Button :disabled="isReportDownloading" @click="downloadTournamentReport('ru')">
        <Download class="size-4" />
        PDF RU
      </Button>
    </div>
  </div>

  <TournamentMarshals
    v-if="tournament"
    :tournamentId="tournament.id"
    :showSelector="
      isMarshalRegistrationOpen &&
      canManageTournamentMarshals &&
      hasOpenFighterRegistration &&
      !tournament.is_marshals_registration_closed
    "
    :canManage="canManageTournamentMarshals"
    @finished="finishMarshalRegistration"
  />

  <div
    class="flex flex-col justify-center items-center mb-5"
    v-if="tournament && canEdit && tournamentNominations.open.length && !nominationFinished"
  >
    <h3 class="mb-4">{{ $t('tournamentPageFightersSelectLabel') }}</h3>
    <FightersSelect :tournamentId="tournament.id" :nominations="tournamentNominations.open" />
  </div>

  <CollapsibleSection
    v-if="tournament && cardsStore.tournamentCards.length"
    :title="$t('disciplinaryCardsTitle')"
    v-model:isOpen="isCardsOpen"
  >
    <TournamentCardsTable
      :cards="cardsStore.tournamentCards"
      :canManage="canManageCards"
      :canDelete="canDeleteCards"
      @changed="refreshCardsAndCompetition"
    />
  </CollapsibleSection>

  <Tabs v-if="tournament && tournamentNominations.all.length" v-model="activeTab" class="m-4">
    <div class="mb-4 overflow-x-auto pb-1">
      <TabsList
        class="inline-flex h-auto min-h-9 min-w-max md:grid md:w-full md:min-w-0"
        :style="{
          gridTemplateColumns: `repeat(${tournamentNominations.all.length}, minmax(0, 1fr))`
        }"
      >
        <TabsTrigger
          v-for="nom in tournamentNominations.all"
          :key="nom.id"
          :value="nom.id"
          class="min-w-36 flex-none cursor-pointer px-3 tracking-tight md:min-w-0 md:flex-1"
        >
          {{ nom[`name_${i18next.language as 'ru' | 'en'}`] }}
        </TabsTrigger>
      </TabsList>
    </div>

    <TabsContent :key="activeTab" :value="activeTab" class="mt-0 min-w-0">
      <template v-if="!isNominationLoading">
        <CompetitionPodium :placements="placements" />

        <CollapsibleSection
          v-if="nominationCompetitors.length"
          :title="$t('tournamentPageRegisteredFighters')"
          v-model:isOpen="isCompetitorsListOpen"
        >
          <NominationCompetitors
            :competitors="nominationCompetitors"
            :activeTab="activeTab"
            :hasAccess="canEditCompetition"
            :isOpen="isCurrentNominationOpen"
            :hasBlocks="blocks.length > 0"
            :activeCardTypes="activeCardTypes"
            @close="closeRegistration"
          />
        </CollapsibleSection>

        <div
          class="flex flex-wrap justify-center gap-3 my-5"
          v-if="
            canEditCompetition &&
            !isCurrentNominationOpen &&
            !blocks.length &&
            nominationCompetitors.length >= 3
          "
        >
          <Button @click="createGroupBlock">{{ $t('tournamentPageCreateGroups') }}</Button>
          <Button v-if="canOfferOlympic" @click="() => createOlympicBlock()">{{
            $t('tournamentPageOlympicBracket')
          }}</Button>
        </div>

        <div
          class="flex justify-center my-5 text-sm text-muted-foreground"
          v-if="
            canEditCompetition &&
            !isCurrentNominationOpen &&
            !blocks.length &&
            nominationCompetitors.length > 0 &&
            nominationCompetitors.length < 3
          "
        >
          At least 3 fighters are required.
        </div>

        <section v-for="block in blocks" :key="block.id" class="my-6">
          <CollapsibleSection
            :title="blockTitle(block)"
            :isOpen="getBlockIsOpen(block)"
            @update:isOpen="(isOpen) => setBlockIsOpen(block, isOpen)"
          >
            <template v-if="block.type === 'GROUP'">
              <NominationGroups
                :groups="block.groups"
                :activeCardTypes="activeCardTypes"
                :highlightedAdvancerCompetitorIds="olympicCompetitorIds"
                :isFixed="
                  !canEditCompetition || block.status !== 'ACTIVE' || block.fights.length > 0
                "
              />
              <div class="mb-3 text-center text-sm text-muted-foreground">
                {{ $t(`tournamentPageLifecycle${block.lifecycleState}`) }}
              </div>
              <div
                class="flex flex-wrap justify-center gap-3 my-5"
                v-if="canEditCompetition && block.status === 'ACTIVE' && block.fights.length === 0"
              >
                <Button :disabled="!canGenerateGroupFights" @click="generateGroupFights(block.id)">
                  {{ $t('tournamentPageGenerateFights') }}
                </Button>
                <Button variant="destructive" @click="rollbackBlock(block.id)">
                  {{ $t('tournamentPageReturnPreviousStage') }}
                </Button>
              </div>
              <FightsDisplay
                v-if="block.fightsBlocks.length"
                :blockId="block.id"
                :blocksData="block.fightsBlocks"
                :hasAccess="
                  canEditCompetition &&
                  block.status === 'ACTIVE' &&
                  block.lifecycleState === 'FIGHTS_EDITABLE'
                "
                :canIssueCards="
                  canManageCards &&
                  block.status === 'ACTIVE' &&
                  block.lifecycleState === 'FIGHTS_EDITABLE'
                "
                :tournamentId="tournamentId"
                :cardDate="cardIssueDate"
                :activeCardTypes="activeCardTypes"
                @card-issued="refreshCardsAndCompetition"
              />
              <div
                v-if="
                  canEditCompetition &&
                  block.status === 'ACTIVE' &&
                  block.lifecycleState === 'FIGHTS_EDITABLE'
                "
                class="flex flex-wrap justify-center gap-3 my-5"
              >
                <Button
                  :disabled="!activeGroupBlockComplete || hasBlockingGroupAdvancementTie"
                  @click="fixGroupResults(block.id)"
                >
                  {{ $t('tournamentPageFixResults') }}
                </Button>
                <Button variant="destructive" @click="cancelGroupFightsFixation(block.id)">
                  {{ $t('tournamentPageCancelGroupFixation') }}
                </Button>
              </div>
              <div
                v-if="
                  canEditCompetition &&
                  block.status === 'ACTIVE' &&
                  block.lifecycleState === 'RESULTS_FIXED'
                "
                class="flex justify-center my-5"
              >
                <Button variant="destructive" @click="cancelGroupResultsFixation(block.id)">
                  {{ $t('tournamentPageCancelResultsFixation') }}
                </Button>
              </div>
            </template>

            <OlympicBracket
              v-else
              :block="block"
              :hasAccess="canEditCompetition && block.status === 'ACTIVE'"
              :canIssueCards="canManageCards"
              :tournamentId="tournamentId"
              :cardDate="cardIssueDate"
              :activeCardTypes="activeCardTypes"
              :attachedCardCountByFightId="attachedCardCountByFightId"
              @card-issued="refreshCardsAndCompetition"
              @lifecycle-changed="refreshCardsAndCompetition"
            />
          </CollapsibleSection>
        </section>

        <TieResolver v-if="canEditCompetition" />

        <div
          v-if="canEditCompetition && activeOlympicFinalResultsFixed"
          class="flex justify-center my-5"
        >
          <Button @click="finishCompetition">{{ $t('tournamentPageFixTournamentResults') }}</Button>
        </div>

        <div
          class="flex flex-wrap justify-center gap-3 my-5"
          v-if="
            canEditCompetition &&
            activeBlock?.type === 'GROUP' &&
            activeBlock.lifecycleState === 'RESULTS_FIXED' &&
            !hasBlockingGroupAdvancementTie &&
            !nominationFinished
          "
        >
          <Button v-if="activeBlock.groups.length === 1" @click="finishCompetition"
            >{{ $t('tournamentPageFixTournamentResults') }}</Button
          >
          <template v-else>
            <Button @click="createGroupBlock">{{ $t('tournamentPageNextSubgroups') }}</Button>
            <Button v-if="canOfferOlympic" @click="() => createOlympicBlock()">{{
              $t('tournamentPageOlympicBracket')
            }}</Button>
            <Button v-if="canOfferOlympicWithThirdPlaces" @click="() => createOlympicBlock(true)">
              {{ $t('tournamentPageOlympicBracketWithThirdPlaces') }}
            </Button>
          </template>
        </div>
      </template>
    </TabsContent>
  </Tabs>
</template>
