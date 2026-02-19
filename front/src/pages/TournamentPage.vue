<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTournamentsListStore } from '@/stores/tournamentsList'
import { Button } from '@/components/ui/button'
import { dateToString, tData } from '@/lib/utils'

const route = useRoute()
const router = useRouter()
const TournamentsListStore = useTournamentsListStore()
const tournamentId = +route.params.id
const tournament = ref<any>(null)

onMounted(async () => {
  tournament.value = await TournamentsListStore.showTournamentDetails(tournamentId)
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
  <div class="flex justify-center">
    <Button variant="default" size="default" @click="router.push(`/tournaments`)">
      {{ $t('tournamentPageBackButton') }}
    </Button>
  </div>
</template>
