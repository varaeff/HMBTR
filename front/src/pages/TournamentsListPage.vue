<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTournamentsListStore } from '@/stores/tournamentsList'
import { Button } from '@/components/ui/button'
import { SearchWidget } from '@/widgets/SearchWidget'
import { TournamentCard } from '@/widgets/TournamentCard'
import type { Tournament } from '@/model'

const router = useRouter()

const tournamentsList = ref([] as Tournament[])
const tournamentsListStore = useTournamentsListStore()

const getTournaments = async () => {
  try {
    await tournamentsListStore.getTournamentsList()
    const data = tournamentsListStore.filteredTournamentsList
    return data
  } catch (error) {
    console.error('Error loading tournaments:', error)
    return []
  }
}

onMounted(async () => {
  tournamentsListStore.clearSearchString()
  tournamentsList.value = await getTournaments()
})

const searchString = computed(() => tournamentsListStore.getSearchString)
const showAddButton = computed(() => tournamentsListStore.getSearchString.length > 0)

const inputWidth = computed(() => {
  return window.innerWidth < 1024 ? '80%' : '30%'
})

const addTournament = () => {
  router.push('/addTournament')
}

watch(searchString, () => {
  tournamentsList.value = tournamentsListStore.filteredTournamentsList
})
</script>

<template>
  <h1 class="flex justify-center mb-4">Учтённые турниры</h1>
  <div>
    <SearchWidget
      :inputWidth="inputWidth"
      class="p-2"
      placeholder="Введите название или город"
      :store="useTournamentsListStore"
    />

    <div class="flex flex-wrap gap-5 justify-center w-full p-5">
      <TournamentCard
        class="cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"
        v-for="tournament in tournamentsList"
        :key="tournament.id"
        @click="router.push(`/tournament/${tournament.id}`)"
        :tournament="tournament"
      />
    </div>
  </div>
  <div class="flex justify-center">
    <Button v-show="showAddButton" @click="addTournament"> Добавить турнир </Button>
  </div>
</template>
