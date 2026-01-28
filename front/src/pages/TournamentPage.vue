<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTournamentsListStore } from '@/stores/tournamentsList'

const route = useRoute()
const router = useRouter()
const TournamentsListStore = useTournamentsListStore()
const tournamentId = +route.params.id
const tournament = ref<any>(null)

onMounted(async () => {
  try {
    tournament.value = await TournamentsListStore.showTournamentDetails(tournamentId)
  } catch (error) {
    console.error('Error loading tournament details:', error)
    tournament.value = null
  }
})

const tournamentName = computed(() => tournament.value?.name ?? '')

const tournamentDetails = computed(() => {
  if (!tournament.value) return ''
  return `${tournament.value.country}, ${tournament.value.city},
      ${new Date(tournament.value.event_date).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`
})
</script>

<template>
  <div class="tournamentInfo" v-if="tournament">
    <h1>{{ tournamentName }}</h1>
    <div v-if="tournament.id !== 0">
      {{ tournamentDetails }}
    </div>
  </div>
  <div class="bottom-btn">
    <button class="btn btn-primary-accent btn-large" @click="router.push(`/tournaments`)">
      К списку турниров
    </button>
  </div>
</template>

<style scoped>
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.tournamentInfo {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
}
</style>
