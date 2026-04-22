<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useTranslation } from 'i18next-vue'

import { useTournamentsListStore } from '@/stores/tournamentsList'
import { useFightersListStore } from '@/stores/fightersList'
import { useCommonDataStore } from '@/stores/commonData'
import { useCompetitionStore } from '@/stores/competition'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

import { FightsDisplay } from '@/widgets/FightsDisplay'
import { FightersSelect } from '@/widgets/FightersSelect'
import { NominationCompetitors } from '@/widgets/NominationCompetitors'
import { NominationGroups } from '@/widgets/NominationGroups'
import { CollapsibleSection } from '@/widgets/CollapsibleSection'

import { useCollapsiblePersist } from '@/composables/useCollapsiblePersist'
import { tData } from '@/lib/utils'
import { generateGroups } from '@/lib/generateGroups'
import { stageGroupFights } from '@/lib/generateFights'
import { dateToString } from '@/lib/dateUtils'
import { hasAccess } from '@/lib/checkAccess'

import type { Tournament } from '@/model'

const props = defineProps<{
  id: string
}>()

const TournamentsListStore = useTournamentsListStore()
const FightersListStore = useFightersListStore()
const commonDataStore = useCommonDataStore()
const competitionStore = useCompetitionStore()
const { i18next } = useTranslation()

const tournamentId = computed(() => +props.id)
const tournament = ref<Tournament | null>(null)

const activeTab = ref<number>(0)
const canEdit = hasAccess()

const loadNominationData = async (nomId: number) => {
  competitionStore.setGroups([])
  competitionStore.setFightsBlocks([])
  competitionStore.setTournamentAndNomination(tournamentId.value, nomId)
  await competitionStore.setCompetitors()
}

const isCompetitorsListOpen = useCollapsiblePersist(
  'competitors',
  computed(() => `${tournamentId.value}-${activeTab.value}`)
)

const isGroupsFirstOpen = useCollapsiblePersist(
  'groups-first',
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

const isCurrentNominationOpen = computed(() =>
  tournamentNominations.value.open.some((n) => n.id === activeTab.value)
)

const tournamentName = computed(() => tournament.value?.name ?? '')

const tournamentDetails = computed(() => {
  if (!tournament.value) return ''
  return `${tData(tournament.value.country)}, ${tData(tournament.value.city)},
      ${dateToString(tournament.value.event_date)}`
})

const nominationCompetitors = computed(() => competitionStore.getNominationFighters)

const haveLessThanThree = computed(() => {
  if (!competitionStore.getGroups.length) return true

  return competitionStore.getGroups.every((group) => group.fighters.length > 2)
})

const isFightsGenerated = computed(() => {
  return competitionStore.getFightsBlocks.length > 0
})

const closeRegistration = async () => {
  await TournamentsListStore.updateTournamentNomination(tournamentId.value, activeTab.value, false)
  const targetNom = tournament.value?.nominations.find((n) => n.nomination_id === activeTab.value)

  if (targetNom) {
    targetNom.is_open = false
  }
}

const createGroups = () => {
  competitionStore.setGroups(generateGroups(nominationCompetitors.value, 0))
  competitionStore.setFightsBlocks([])
  isCompetitorsListOpen.value = false
}

const generateFights = () => {
  const groupsToGenerate = competitionStore.getGroups
  competitionStore.setFightsBlocks(stageGroupFights(groupsToGenerate))
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

watch(tournamentNominations, (noms) => {
  if (noms.all.length && !activeTab.value) {
    activeTab.value = noms.all[0].id
  }
})
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
    v-if="tournament && canEdit && tournamentNominations.open.length"
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

    <TabsContent :value="activeTab" class="mt-0">
      <CollapsibleSection
        v-if="nominationCompetitors.length"
        :title="$t('tournamentPageRegisteredFighters')"
        v-model:isOpen="isCompetitorsListOpen"
      >
        <NominationCompetitors
          :competitors="nominationCompetitors"
          :activeTab="activeTab"
          :hasAccess="canEdit"
          :isOpen="isCurrentNominationOpen"
          @close="closeRegistration"
        />
      </CollapsibleSection>

      <div
        class="flex flex-col justify-center items-center my-5"
        v-if="canEdit && !isCurrentNominationOpen && !competitionStore.getGroups.length"
      >
        <Button @click="createGroups">{{ $t('tournamentPageCreateGroups') }}</Button>
      </div>

      <CollapsibleSection
        v-if="competitionStore.getGroups.length"
        :title="$t('tournamentPageStage1')"
        v-model:isOpen="isGroupsFirstOpen"
      >
        <NominationGroups v-if="competitionStore.getGroups.length" :isFixed="isFightsGenerated" />

        <div
          class="flex flex-col justify-center items-center my-5"
          v-if="canEdit && competitionStore.getGroups.length && !isFightsGenerated"
        >
          <Button :disabled="!haveLessThanThree" @click="generateFights">{{
            $t('tournamentPageGenerateFights')
          }}</Button>
        </div>

        <FightsDisplay v-if="competitionStore.getFightsBlocks.length" />
      </CollapsibleSection>
    </TabsContent>
  </Tabs>
</template>
