<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useTranslation } from 'i18next-vue'
import { useTournamentsListStore } from '@/stores/tournamentsList'
import { useFightersListStore } from '@/stores/fightersList'
import { useCommonDataStore } from '@/stores/commonData'
import { useCompetitionStore } from '@/stores/competition'
import { hasAccess } from '@/lib/checkAccess'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { FightsDisplay } from '@/widgets/FightsDisplay'
import { FightersSelect } from '@/widgets/FightersSelect'
import { NominationCompetitors } from '@/widgets/NominationCompetitors'
import { NominationGroups } from '@/widgets/NominationGroups'

import { useCollapsiblePersist } from '@/composables/useCollapsiblePersist'
import { tData } from '@/lib/utils'
import { generateGroups } from '@/lib/generateGroups'
import { stageGroupFights } from '@/lib/generateFights'
import { updateGroupsStatistics } from '@/lib/groupsStatistic'
import { dateToString } from '@/lib/dateUtils'
import { ChevronsUpDown } from 'lucide-vue-next'
import type { Tournament, Fighter, Group, BlockData } from '@/model'

const props = defineProps<{
  id: string
}>()

const TournamentsListStore = useTournamentsListStore()
const fightersListStore = useFightersListStore()
const commonDataStore = useCommonDataStore()
const competitionStore = useCompetitionStore()
const { i18next } = useTranslation()

const tournamentId = computed(() => +props.id)
const tournament = ref<Tournament | null>(null)

const groups = ref<Group[]>([])
const fightsBlocks = ref<BlockData[]>([])
const activeTab = ref<number>(0)
const canEdit = hasAccess()

const isCompetitorsListOpen = useCollapsiblePersist(
  'competitors',
  computed(() => `${tournamentId.value}-${activeTab.value}`)
)

const isGroupsFirstOpen = useCollapsiblePersist(
  'groups-first',
  computed(() => `${tournamentId.value}-${activeTab.value}`)
)

const allTournamentNominations = computed(() => {
  if (!tournament.value || !commonDataStore.nominations.length) return []

  const activeIds = new Set(tournament.value.nominations.map((tn) => tn.nomination_id))
  return commonDataStore.nominations
    .filter((nom) => activeIds.has(nom.id))
    .sort((a, b) => a.id - b.id)
})

const openNominations = computed(() => {
  if (!tournament.value) return []
  const openIds = new Set(
    tournament.value.nominations.filter((tn) => tn.is_open).map((tn) => tn.nomination_id)
  )
  return allTournamentNominations.value.filter((nom) => openIds.has(nom.id))
})

const isCurrentNominationOpen = computed(() =>
  openNominations.value.some((n) => n.id === activeTab.value)
)

const tournamentName = computed(() => tournament.value?.name ?? '')

const tournamentDetails = computed(() => {
  if (!tournament.value) return ''
  return `${tData(tournament.value.country)}, ${tData(tournament.value.city)},
      ${dateToString(tournament.value.event_date)}`
})

const nominationCompetitors = computed(() => {
  const allFighters: Fighter[] = fightersListStore.fightersList
  const currentIds = new Set(competitionStore.getNominationCompetitors.map((c) => c.fighter_id))

  return allFighters.filter((f) => currentIds.has(f.id))
})

const haveLessThanThree = computed(() => {
  if (!groups.value.length) return true

  return groups.value.every((group) => group.fighters.length > 2)
})

const isFightsGenerated = computed(() => {
  return fightsBlocks.value.length > 0
})

const closeRegistration = async () => {
  await TournamentsListStore.updateTournamentNomination(tournamentId.value, activeTab.value, false)
  tournament.value = await TournamentsListStore.showTournamentDetails(tournamentId.value)
}

const createGroups = () => {
  groups.value = generateGroups(nominationCompetitors.value, 0)
  fightsBlocks.value = []
  isCompetitorsListOpen.value = false
}

const generateFights = () => {
  const groupsToGenerate = groups.value
  fightsBlocks.value = stageGroupFights(groupsToGenerate)
}

const updateGlobalScore = ({ fightNumber, f1Score, f2Score }: any) => {
  // Находим нужный бой во всех блоках и обновляем его
  for (const block of fightsBlocks.value) {
    const fight = block.fights.find((f) => f.number === fightNumber)
    if (fight) {
      fight.fighter1Score = f1Score
      fight.fighter2Score = f2Score
      break
    }
  }
}

onMounted(async () => {
  const [, fetchedTournament] = await Promise.all([
    commonDataStore.fetchNominations(),
    TournamentsListStore.showTournamentDetails(tournamentId.value),
    fightersListStore.getFightersList()
  ])

  tournament.value = fetchedTournament

  if (tournament.value && allTournamentNominations.value.length) {
    const firstNomId = allTournamentNominations.value[0].id
    activeTab.value = firstNomId
    competitionStore.setTournamentAndNomination(tournamentId.value, firstNomId)
    await competitionStore.setCompetitors()
  }
})

watch(
  allTournamentNominations,
  (newNoms) => {
    if (newNoms.length && !activeTab.value) {
      activeTab.value = newNoms[0].id
    }
  },
  { immediate: true }
)

watch(activeTab, async (newVal) => {
  if (newVal) {
    competitionStore.setTournamentAndNomination(tournamentId.value, newVal)
    groups.value = []
    fightsBlocks.value = []
  }
})

watch(
  () =>
    fightsBlocks.value.flatMap((b) => b.fights.map((f) => `${f.fighter1Score}:${f.fighter2Score}`)),
  () => {
    updateGroupsStatistics(groups.value, fightsBlocks.value)
  }
)
</script>

<template>
  <div class="flex flex-col justify-center items-center mb-5" v-if="tournament">
    <h1 class="mb-4">{{ tData(tournamentName) }}</h1>
    <div v-if="tournament.id !== 0">
      {{ tournamentDetails }}
    </div>
  </div>

  <div
    class="flex flex-col justify-center items-center mb-5"
    v-if="tournament && canEdit && openNominations.length"
  >
    <h3 class="mb-4">{{ $t('tournamentPageFightersSelectLabel') }}</h3>
    <FightersSelect :tournamentId="tournament.id" :nominations="openNominations" />
  </div>

  <Tabs v-if="tournament && allTournamentNominations.length" v-model="activeTab" class="m-4">
    <TabsList
      class="grid w-full mb-4 h-9"
      :style="{ gridTemplateColumns: `repeat(${allTournamentNominations.length}, minmax(0, 1fr))` }"
    >
      <TabsTrigger
        v-for="nom in allTournamentNominations"
        :key="nom.id"
        :value="nom.id"
        class="tracking-tight cursor-pointer"
      >
        {{ nom[`name_${i18next.language as 'ru' | 'en'}`] }}
      </TabsTrigger>
    </TabsList>

    <TabsContent :value="activeTab" class="mt-0">
      <Collapsible
        v-if="nominationCompetitors.length"
        v-model:open="isCompetitorsListOpen"
        class="flex flex-col gap-2"
      >
        <div class="flex items-center gap-4 px-4">
          <h4 class="text-sm font-semibold">{{ $t('tournamentPageRegisteredFighters') }}</h4>
          <CollapsibleTrigger as-child>
            <Button variant="ghost" size="icon" class="size-8">
              <ChevronsUpDown />
              <span class="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <NominationCompetitors
            :competitors="nominationCompetitors"
            :activeTab="activeTab"
            :hasAccess="canEdit"
            :isOpen="isCurrentNominationOpen"
            @close="closeRegistration"
          />
        </CollapsibleContent>
      </Collapsible>

      <div
        class="flex flex-col justify-center items-center my-5"
        v-if="canEdit && !isCurrentNominationOpen && !groups.length"
      >
        <Button @click="createGroups">{{ $t('tournamentPageCreateGroups') }}</Button>
      </div>

      <Collapsible
        v-if="groups.length"
        v-model:open="isGroupsFirstOpen"
        class="flex flex-col gap-2"
      >
        <div class="flex items-center gap-4 px-4">
          <h4 class="text-sm font-semibold">{{ $t('tournamentPageGroupsFirst') }}</h4>
          <CollapsibleTrigger as-child>
            <Button variant="ghost" size="icon" class="size-8">
              <ChevronsUpDown />
              <span class="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <NominationGroups
            v-if="groups.length"
            :groups="groups"
            :isFixed="isFightsGenerated"
            @update-groups="groups = $event"
          />
        </CollapsibleContent>
      </Collapsible>

      <div
        class="flex flex-col justify-center items-center my-5"
        v-if="canEdit && groups.length && !isFightsGenerated"
      >
        <Button :disabled="!haveLessThanThree" @click="generateFights">{{
          $t('tournamentPageGenerateFights')
        }}</Button>
      </div>

      <FightsDisplay
        v-if="fightsBlocks.length"
        :blocks="fightsBlocks"
        @update-fight-score="updateGlobalScore"
      />
    </TabsContent>
  </Tabs>
</template>
