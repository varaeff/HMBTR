<script setup lang="ts">
import { ref, watch, onMounted, computed, reactive } from 'vue'
import { useTranslation } from 'i18next-vue'
import { Download } from 'lucide-vue-next'

import http from '@/api/http'
import { useTournamentsListStore } from '@/stores/tournamentsList'
import { useFightersListStore } from '@/stores/fightersList'
import { useCommonDataStore } from '@/stores/commonData'
import { useCompetitionStore } from '@/stores/competition'
import { useApiUiStore } from '@/stores/apiUi'

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

import { useCollapsiblePersist } from '@/composables/useCollapsiblePersist'
import { tData } from '@/lib/utils'
import { dateToString } from '@/lib/dateUtils'
import { hasAccess } from '@/lib/checkAccess'
import { API_ROUTES } from '@shared/routes'

import type { CompetitionBlock, Tournament } from '@/model'

const props = defineProps<{
  id: string
}>()

const TournamentsListStore = useTournamentsListStore()
const FightersListStore = useFightersListStore()
const commonDataStore = useCommonDataStore()
const competitionStore = useCompetitionStore()
const apiUiStore = useApiUiStore()
const { i18next } = useTranslation()

const tournamentId = computed(() => +props.id)
const tournament = ref<Tournament | null>(null)

const activeTab = ref<number>(0)
const canEdit = hasAccess()
const isNominationLoading = ref(false)
const isReportDownloading = ref(false)
const blockOpenStates = reactive<Record<string, boolean>>({})
let nominationLoadRequestId = 0
const REPORT_DOWNLOAD_TIMEOUT_MS = 120000

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
  tournamentNominations.value.open.some((n) => n.id === activeTab.value)
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
const nominationFinished = computed(
  () => competitionStore.getIsFinished || Boolean(currentTournamentNomination.value?.is_finished)
)
const allTournamentNominationsFinished = computed(
  () =>
    Boolean(tournament.value?.nominations.length) &&
    tournament.value!.nominations.every((nomination) => nomination.is_finished)
)

const canEditCompetition = computed(() => canEdit && !nominationFinished.value)

const activeGroupBlockComplete = computed(() => {
  if (!activeBlock.value || activeBlock.value.type !== 'GROUP') return false
  return (
    activeBlock.value.fights.length > 0 &&
    activeBlock.value.fights.every((fight) => fight.isFinished)
  )
})

const activeGroupFightsGenerated = computed(() => {
  return Boolean(activeBlock.value?.type === 'GROUP' && activeBlock.value.fights.length > 0)
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
  if (!activeGroupBlockComplete.value || competitionStore.getPendingTie) return 0
  return activeBlock.value.groups.length === 1
    ? activeBlock.value.groups[0].fighters.length
    : activeBlock.value.groups.length * 2
})

const canOfferOlympic = computed(() =>
  [4, 8, 16].includes(activeAdvancerCount.value || nominationCompetitors.value.length)
)

const closeRegistration = async () => {
  await TournamentsListStore.updateTournamentNomination(tournamentId.value, activeTab.value, false)
  const targetNom = tournament.value?.nominations.find((n) => n.nomination_id === activeTab.value)

  if (targetNom) {
    targetNom.is_open = false
  }
}

const createGroupBlock = () => {
  competitionStore.createGroupBlock()
}

const createOlympicBlock = () => {
  competitionStore.createOlympicBlock()
}

const generateGroupFights = (blockId: number) => {
  competitionStore.generateGroupFights(blockId)
}

const finishCompetition = async () => {
  await competitionStore.finishCompetition()
  const targetNom = tournament.value?.nominations.find((n) => n.nomination_id === activeTab.value)
  if (targetNom) {
    targetNom.is_finished = true
    targetNom.is_open = false
  }
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

const getReportErrorMessage = async (error: unknown) => {
  const responseData = (error as any)?.response?.data

  if (responseData instanceof Blob) {
    const text = await responseData.text()

    try {
      const parsed = JSON.parse(text)
      const details = Array.isArray(parsed.details) ? parsed.details.join(', ') : parsed.details

      return details || parsed.error || text || 'Failed to download tournament report'
    } catch {
      return text || 'Failed to download tournament report'
    }
  }

  return (
    responseData?.details ||
    responseData?.error ||
    (error as Error)?.message ||
    'Failed to download tournament report'
  )
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
    TournamentsListStore.showTournamentDetails(tournamentId.value),
    FightersListStore.getFightersList()
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

watch(tournamentNominations, (noms) => {
  if (noms.all.length && !activeTab.value) {
    activeTab.value = noms.all[0].id
  }
})
</script>

<template>
  <div class="flex flex-col justify-center items-center mb-5" v-if="tournament">
    <h1 class="mb-4">{{ tournamentName }}</h1>
    <div v-if="tournament.id !== 0">
      {{ tournamentDetails }}
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

  <div
    class="flex flex-col justify-center items-center mb-5"
    v-if="tournament && canEdit && tournamentNominations.open.length && !nominationFinished"
  >
    <h3 class="mb-4">{{ $t('tournamentPageFightersSelectLabel') }}</h3>
    <FightersSelect :tournamentId="tournament.id" :nominations="tournamentNominations.open" />
  </div>

  <Tabs v-if="tournament && tournamentNominations.all.length" v-model="activeTab" class="m-4">
    <TabsList
      class="grid w-full mb-4 h-9"
      :style="{
        gridTemplateColumns: `repeat(${tournamentNominations.all.length}, minmax(0, 1fr))`
      }"
    >
      <TabsTrigger
        v-for="nom in tournamentNominations.all"
        :key="nom.id"
        :value="nom.id"
        class="tracking-tight cursor-pointer"
      >
        {{ nom[`name_${i18next.language as 'ru' | 'en'}`] }}
      </TabsTrigger>
    </TabsList>

    <TabsContent :key="activeTab" :value="activeTab" class="mt-0">
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
          <Button v-if="canOfferOlympic" @click="createOlympicBlock">{{
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
                :isFixed="
                  !canEditCompetition || block.status !== 'ACTIVE' || block.fights.length > 0
                "
              />
              <div
                class="flex flex-col items-center my-5"
                v-if="canEditCompetition && block.status === 'ACTIVE' && block.fights.length === 0"
              >
                <Button :disabled="!canGenerateGroupFights" @click="generateGroupFights(block.id)">
                  {{ $t('tournamentPageGenerateFights') }}
                </Button>
              </div>
              <FightsDisplay
                v-if="block.fightsBlocks.length"
                :blockId="block.id"
                :blocksData="block.fightsBlocks"
                :hasAccess="canEditCompetition && block.status === 'ACTIVE'"
              />
            </template>

            <OlympicBracket
              v-else
              :block="block"
              :hasAccess="canEditCompetition && block.status === 'ACTIVE'"
            />
          </CollapsibleSection>
        </section>

        <TieResolver v-if="canEditCompetition" />

        <div
          class="flex flex-wrap justify-center gap-3 my-5"
          v-if="
            canEditCompetition &&
            activeBlock?.type === 'GROUP' &&
            activeGroupBlockComplete &&
            !competitionStore.getPendingTie &&
            !nominationFinished
          "
        >
          <Button v-if="activeBlock.groups.length === 1" @click="finishCompetition"
            >Finish nomination</Button
          >
          <template v-else>
            <Button @click="createGroupBlock">{{ $t('tournamentPageNextSubgroups') }}</Button>
            <Button v-if="canOfferOlympic" @click="createOlympicBlock">{{
              $t('tournamentPageOlympicBracket')
            }}</Button>
          </template>
        </div>
      </template>
    </TabsContent>
  </Tabs>
</template>
