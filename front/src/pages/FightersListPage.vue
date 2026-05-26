<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFightersListStore } from '@/stores/fightersList'
import { hasAccess } from '@/lib/checkAccess'
import { FighterCard } from '@/components/ui/fighterCard'
import { Button } from '@/components/ui/button'
import { SearchWidget } from '@/widgets/SearchWidget'
import type { Fighter } from '@/model'

const router = useRouter()
const fightersList = ref([] as Fighter[])
const fightersListStore = useFightersListStore()

const getFighters = async () => {
  await fightersListStore.getFightersList()
  const data: Fighter[] = fightersListStore.filteredFightersList
  return data
}

onMounted(async () => {
  fightersListStore.clearSearchString()
  fightersList.value = await getFighters()
})

const searchString = computed(() => fightersListStore.getSearchString)
const showAddButton = computed(() => fightersListStore.getSearchString.length > 0 && hasAccess())

const addFighter = () => {
  router.push('/addFighter')
}

watch(searchString, () => {
  fightersList.value = fightersListStore.filteredFightersList
})
</script>

<template>
  <main class="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
    <header class="flex flex-col items-center gap-4">
      <h1 class="text-center text-2xl font-semibold sm:text-3xl">{{ $t('fightersPageName') }}</h1>
      <SearchWidget
        class="w-full max-w-2xl"
        :placeholder="$t('fightersSearchPlaceholder')"
        :store="useFightersListStore"
      />
    </header>

    <div
      class="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] items-stretch gap-4 sm:gap-5"
    >
      <FighterCard
        v-for="fighter in fightersList"
        :key="fighter.id"
        class="h-full"
        :name="`${fighter.surname} ${fighter.name}`"
        :description="`${fighter.city} ${fighter.club || ''}`"
        :pic="fighter.pic"
        @click="router.push(`/fighter/${fighter.id}`)"
      />
    </div>

    <div class="flex justify-center">
      <Button v-show="showAddButton" variant="default" size="default" @click="addFighter">{{
        $t('addFighterButton')
      }}</Button>
    </div>
  </main>
</template>
