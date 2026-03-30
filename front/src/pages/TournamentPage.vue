<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useTranslation } from 'i18next-vue'
import { useRoute, useRouter } from 'vue-router'
import { useTournamentsListStore } from '@/stores/tournamentsList'
import { useCommonDataStore } from '@/stores/commonData'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { FightersSelect } from '@/widgets/FightersSelect'
import { dateToString, tData } from '@/lib/utils'
import type { Tournament, Nomination } from '@/model'

const route = useRoute()
const router = useRouter()
const TournamentsListStore = useTournamentsListStore()
const commonDataStore = useCommonDataStore()
const { i18next } = useTranslation()

const tournamentId = +route.params.id
const tournament = ref<Tournament | null>(null)
const nominations = ref<Nomination[]>([])
const activeTab = ref<string | number>('')

onMounted(async () => {
  const tournamentData = await TournamentsListStore.showTournamentDetails(tournamentId)
  tournament.value = tournamentData

  const allNominations = await commonDataStore.fetchNominations()

  if (tournamentData && tournamentData.nominations_ids) {
    nominations.value = allNominations.filter((nom: Nomination) =>
      tournamentData.nominations_ids.includes(nom.id)
    )
  } else {
    nominations.value = []
  }

  if (nominations.value.length > 0) {
    activeTab.value = nominations.value[0].id
  }
})

const tournamentName = computed(() => tournament.value?.name ?? '')

const tournamentDetails = computed(() => {
  if (!tournament.value) return ''
  return `${tData(tournament.value.country)}, ${tData(tournament.value.city)},
      ${dateToString(tournament.value.event_date)}`
})
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
        tournament id: {{ tournament?.id }} <br />
        nomination id: {{ activeTab }} <br />
      </div>
    </TabsContent>
  </Tabs>

  <div class="flex justify-center">
    <Button variant="default" size="default" @click="router.push(`/tournaments`)">
      {{ $t('tournamentPageBackButton') }}
    </Button>
  </div>
</template>
