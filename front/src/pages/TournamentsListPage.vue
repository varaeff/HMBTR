<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTournamentsListStore } from '@/stores/tournamentsList'
import { Button } from '@/components/ui/button'
import { SearchWidget } from '@/widgets/SearchWidget'
import { TournamentCard } from '@/widgets/TournamentCard'
import { useTranslation } from 'i18next-vue'
import type { Tournament } from '@/model'

const router = useRouter()

const tournamentsList = ref([] as Tournament[])
const tournamentsListStore = useTournamentsListStore()

const { i18next } = useTranslation()

const getTournaments = async () => {
  await tournamentsListStore.getTournamentsList()
  const data: Tournament[] = tournamentsListStore.filteredTournamentsList
  return data
}

onMounted(async () => {
  tournamentsListStore.clearSearchString()
  tournamentsList.value = await getTournaments()
})

const searchString = computed(() => tournamentsListStore.getSearchString)
const showAddButton = computed(() => tournamentsListStore.getSearchString.length > 0)

const addTournament = () => {
  router.push('/addTournament')
}

watch(searchString, () => {
  tournamentsList.value = tournamentsListStore.filteredTournamentsList
})
</script>

<template>
  <h1 class="flex justify-center mb-4">{{ $t('tournamentsPageNamePage') }}</h1>
  <div>
    <div class="w-full flex justify-center">
      <SearchWidget
        class="w-11/12 lg:w-5/12 pt-2 pb-2"
        :placeholder="$t('tournamentsPagePlaceholder')"
        :store="useTournamentsListStore"
      />
    </div>
    <div class="flex flex-wrap gap-5 justify-center w-full p-5">
      <TournamentCard
        class="cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"
        v-for="tournament in tournamentsList"
        :key="i18next.language + tournament.id"
        @click="router.push(`/tournament/${tournament.id}`)"
        :tournament="tournament"
      />
    </div>
  </div>
  <div class="flex justify-center">
    <Button v-show="showAddButton" @click="addTournament"
      >{{ $t('tournamentsPageAddButton') }}
    </Button>
  </div>
</template>
