<template>
  <h1 class="title">Учтённые турниры</h1>
  <LoaderComponent v-if="isLoading" />
  <div v-else>
    <div class="title">
      <SeachComponent
        :placeholder="'Введите название турнира или город проведения...'"
        :clearBtn="true"
        :btnTitle="'Очистить поиск'"
        :width="30"
        :store="useTournamentsListStore"
      />
    </div>
    <div class="tournamentsList">
      <span v-for="tournament in tournamentsList" :key="tournament.id">
        {{ tournament.name }} - {{ tournament.country }} - {{ tournament.city }} -
        {{ new Date(tournament.event_date).toLocaleDateString() }}
      </span>
    </div>
  </div>
  <div class="bottom-btn">
    <Suspense>
      <button class="btn btn-primary-accent btn-large" @click="addTournament">
        Добавить турнир
      </button>
    </Suspense>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import type { Tournament } from '@/shared/model'
import { useTournamentsListStore } from '@/app/stores/tournamentsList'
import LoaderComponent from '@/widgets/LoaderComponent'
import SeachComponent from '@/widgets/SeachComponent'
import { useRouter } from 'vue-router'

const router = useRouter()

const isLoading = ref(true)
const tournamentsList = ref([] as Tournament[])
const tournamentsListStore = useTournamentsListStore()

const getTournaments = async () => {
  try {
    await tournamentsListStore.getTournamentsList()
    const data = tournamentsListStore.filteredTournamentsList
    isLoading.value = false
    return data
  } catch (error) {
    console.error('Error loading tournaments:', error)
    isLoading.value = false
    return []
  }
}

onMounted(async () => {
  tournamentsListStore.$state.seachString = ''
  isLoading.value = true
  tournamentsList.value = await getTournaments()
})

const seachString = computed(() => tournamentsListStore.$state.seachString)

const addTournament = () => {
  router.push('/addTournament')
}

watch(seachString, () => {
  tournamentsList.value = tournamentsListStore.filteredTournamentsList
})
</script>

<style scoped>
.tournamentsList {
  width: 100%;
  padding: 20px;
}
</style>
