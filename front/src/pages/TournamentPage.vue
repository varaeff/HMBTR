<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useTranslation } from 'i18next-vue'
import { useRoute, useRouter } from 'vue-router'
import { useTournamentsListStore } from '@/stores/tournamentsList'
import { useFightersListStore } from '@/stores/fightersList'
import { useCommonDataStore } from '@/stores/commonData'
import { useCompetitionStore } from '@/stores/competition'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { FightersSelect } from '@/widgets/FightersSelect'
import { dateToString, tData } from '@/lib/utils'
import type { Tournament, Nomination, Fighter } from '@/model'

const route = useRoute()
const router = useRouter()
const TournamentsListStore = useTournamentsListStore()
const fightersListStore = useFightersListStore()
const commonDataStore = useCommonDataStore()
const competitionStore = useCompetitionStore()
const { i18next } = useTranslation()

const tournamentId = +route.params.id
const tournament = ref<Tournament | null>(null)
const nominations = ref<Nomination[]>([])
const activeTab = ref<number>(0)

onMounted(async () => {
  tournament.value = await TournamentsListStore.showTournamentDetails(tournamentId)
  const allNominations = await commonDataStore.fetchNominations()

  if (tournament.value && tournament.value.nominations_ids) {
    nominations.value = allNominations.filter((nom: Nomination) =>
      tournament.value!.nominations_ids.includes(nom.id)
    )
  }

  nominations.value.length && (activeTab.value = nominations.value[0].id)

  if (tournament.value) {
    competitionStore.setTournamentAndNomination(tournamentId, activeTab.value)
  }

  await competitionStore.setCompetitors()
})

watch(activeTab, async (newVal) => {
  if (newVal) {
    competitionStore.setTournamentAndNomination(tournamentId, newVal)
  }
})

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
</script>

<template>
  <div class="flex flex-col justify-center items-center mb-5" v-if="tournament">
    <h1 class="mb-4">{{ tData(tournamentName) }}</h1>
    <div v-if="tournament.id !== 0">
      {{ tournamentDetails }}
    </div>
  </div>

  <div class="flex flex-col justify-center items-center mb-5" v-if="tournament">
    <h3 class="mb-4">{{ $t('tournamentPageFightersSelectLabel') }}</h3>
    <FightersSelect :tournamentId="tournament.id" :nominations="nominations" />
  </div>

  <Tabs v-if="tournament && nominations.length" v-model="activeTab" class="m-4">
    <TabsList
      class="grid w-full mb-4 h-9"
      :style="{ gridTemplateColumns: `repeat(${nominations.length}, minmax(0, 1fr))` }"
    >
      <TabsTrigger
        v-for="nom in nominations"
        :key="nom.id"
        :value="nom.id"
        class="tracking-tight cursor-pointer"
      >
        {{ nom[`name_${i18next.language as 'ru' | 'en'}`] }}
      </TabsTrigger>
    </TabsList>

    <TabsContent :value="activeTab" class="mt-0">
      <div class="flex flex-col gap-2">
        <div
          v-for="competitor in nominationCompetitors"
          :key="competitor.id"
          class="flex flex-col gap-1 p-1 border rounded-md"
        >
          <div class="flex justify-between items-center">
            <div class="flex gap-2">
              <div>{{ competitor.surname }} {{ competitor.name }}</div>
              <div class="text-muted-foreground">
                {{ competitor.city }} {{ competitor.club || '' }}
              </div>
            </div>
            <Button variant="outline" size="sm" @click="removeCompetitor(competitor.id)">{{
              $t('tournamentPageRemoveCompetitorButton')
            }}</Button>
          </div>
        </div>
      </div>
    </TabsContent>
  </Tabs>

  <div class="flex justify-center">
    <Button variant="default" size="default" @click="router.push(`/tournaments`)">
      {{ $t('tournamentPageBackButton') }}
    </Button>
  </div>
</template>
