<template>
  <LoaderComponent v-if="isLoading" />
  <div v-else class="tournamentInfo">
    <h1>{{ tournament.name }}</h1>
    <div v-if="tournament.id !== 0">
      {{ tournament.country }}, {{ tournament.city }},
      {{
        new Date(tournament.event_date).toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }}
    </div>
  </div>
  <div class="bottom-btn">
    <Suspense>
      <button class="btn btn-primary-accent btn-large" @click="router.push(`/tournaments`)">
        К списку турниров
      </button>
    </Suspense>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LoaderComponent from '@/widgets/LoaderComponent'
import { useTournamentsListStore } from '@/app/stores/tournamentsList'

const route = useRoute()
const router = useRouter()
const isLoading = ref(true)
const TournamentsListStore = useTournamentsListStore()
const tournamentId = +route.params.id

const getTournament = () => {
  const data = TournamentsListStore.showTournamentDetails(tournamentId)
  isLoading.value = false
  return data
}
const tournament = getTournament()
</script>

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
