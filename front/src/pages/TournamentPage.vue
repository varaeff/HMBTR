<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useTranslation } from 'i18next-vue'
import { useRoute } from 'vue-router'
import { useTournamentsListStore } from '@/stores/tournamentsList'
import { useFightersListStore } from '@/stores/fightersList'
import { useCommonDataStore } from '@/stores/commonData'
import { useCompetitionStore } from '@/stores/competition'
import { hasAccess } from '@/lib/checkAccess'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { FightersSelect } from '@/widgets/FightersSelect'
import { NominationCompetitors } from '@/widgets/NominationCompetitors'
import { dateToString, tData } from '@/lib/utils'
import type { Tournament, Fighter } from '@/model'

const route = useRoute()
const TournamentsListStore = useTournamentsListStore()
const fightersListStore = useFightersListStore()
const commonDataStore = useCommonDataStore()
const competitionStore = useCompetitionStore()
const { i18next } = useTranslation()

const tournamentId = +route.params.id
const tournament = ref<Tournament | null>(null)
const activeTab = ref<number>(0)
const canEdit = hasAccess()

onMounted(async () => {
  const [, fetchedTournament] = await Promise.all([
    commonDataStore.fetchNominations(),
    TournamentsListStore.showTournamentDetails(tournamentId)
  ])

  tournament.value = fetchedTournament

  if (tournament.value) {
    await competitionStore.setCompetitors()
  }
})

const allTournamentNominations = computed(() => {
  if (!tournament.value || !commonDataStore.nominations.length) return []

  const activeIds = new Set(tournament.value.nominations.map((tn) => tn.nomination_id))
  return commonDataStore.nominations.filter((nom) => activeIds.has(nom.id))
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
  const allFighters: Fighter[] = fightersListStore.filteredFightersList
  const currentNominationData = competitionStore.getNominationCompetitors

  return allFighters.filter((fighter) =>
    currentNominationData.some((c) => c.fighter_id === fighter.id)
  )
})

const removeCompetitor = async (fighterId: number) => {
  const competitor = competitionStore.tournamentCompetitors.find(
    (c) => c.fighter_id === fighterId && c.nomination_id === activeTab.value
  )

  if (competitor) {
    await competitionStore.deleteCompetitor(competitor.id)
  }
}

const closeRegistration = async () => {
  await TournamentsListStore.updateTournamentNomination(tournamentId, activeTab.value, false)
  tournament.value = await TournamentsListStore.showTournamentDetails(tournamentId)
}

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
    competitionStore.setTournamentAndNomination(tournamentId, newVal)
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
      <NominationCompetitors
        :competitors="nominationCompetitors"
        :activeTab="activeTab"
        :hasAccess="canEdit"
        :isOpen="isCurrentNominationOpen"
        @remove="removeCompetitor"
        @close="closeRegistration"
      />
    </TabsContent>
  </Tabs>
</template>
