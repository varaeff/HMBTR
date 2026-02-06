<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import type { Tournament } from '@/model'
import { useTournamentsListStore } from '@/stores/tournamentsList'
import { SearchWidget } from '@/widgets/SearchWidget'
import { useRouter } from 'vue-router'

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
  tournamentsListStore.$state.seachString = ''
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

<template>
  <h1 class="flex justify-center">Учтённые турниры</h1>
  <div>
    <SearchWidget
      inputWidth="30%"
      placeholder="Введите название турнира или город проведения"
      :store="useTournamentsListStore"
    />
    <div class="tournamentsList">
      <div
        v-for="tournament in tournamentsList"
        :key="tournament.id"
        class="tournamentItem"
        @click="router.push(`/tournament/${tournament.id}`)"
      >
        <b>{{ tournament.name }}</b>
        <span v-if="tournament.id !== 0">
          {{ tournament.country }}, {{ tournament.city }},
          {{
            new Date(tournament.event_date).toLocaleDateString('ru-RU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          }}
        </span>
      </div>
    </div>
  </div>
  <div class="bottom-btn">
    <button class="btn btn-primary-accent btn-large" @click="addTournament">Добавить турнир</button>
  </div>
</template>

<style scoped>
.tournamentsList {
  width: 100%;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.tournamentItem {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 8px;
  box-shadow: 3px 3px 8px 1px rgba(151, 149, 149, 0.75);
  padding: 5px;
  margin-bottom: 15px;
  font-size: 1.3rem;
  width: 60%;
}

.tournamentItem span {
  font-size: 1rem;
}

.tournamentItem:hover {
  box-shadow: 3px 3px 12px 3px rgba(151, 149, 149, 0.75);
  padding: 7px;
  transition: box-shadow 0.1s ease-in-out;
  cursor: pointer;
}

.tournamentItem:active {
  box-shadow: inset 3px 3px 8px 1px rgba(151, 149, 149, 0.75);
  padding: 5px;
  transition: box-shadow 0.1s ease-in-out;
}
</style>
