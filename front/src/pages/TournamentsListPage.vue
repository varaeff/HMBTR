<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTournamentsListStore } from '@/stores/tournamentsList'
import { hasAccess } from '@/lib/checkAccess'
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
const showAddButton = computed(() => hasAccess())

const addTournament = () => {
  router.push('/addTournament')
}

watch(searchString, () => {
  tournamentsList.value = tournamentsListStore.filteredTournamentsList
})
</script>

<template>
  <main class="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
    <header class="flex flex-col items-center gap-4">
      <h1 class="text-center text-2xl font-semibold sm:text-3xl">
        {{ $t('tournamentsPageNamePage') }}
      </h1>
      <SearchWidget
        class="w-full max-w-2xl"
        :placeholder="$t('tournamentsPagePlaceholder')"
        :store="useTournamentsListStore"
        :showAddButton="showAddButton"
        :addLabel="$t('tournamentsPageAddButton')"
        :addAction="addTournament"
      />
    </header>

    <div
      class="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] items-stretch justify-items-center gap-4 sm:gap-5"
    >
      <TournamentCard
        v-for="tournament in tournamentsList"
        :key="i18next.language + tournament.id"
        class="h-full cursor-pointer hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"
        @click="router.push(`/tournament/${tournament.id}`)"
        :tournament="tournament"
      />
    </div>
  </main>
</template>
