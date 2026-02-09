<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import type { Fighter } from '@/model'
import { useFightersListStore } from '@/stores/fightersList'
import { FighterCard } from '@/components/ui/fighterCard'
import { Button } from '@/components/ui/button'
import { SearchWidget } from '@/widgets/SearchWidget'
import { useRouter } from 'vue-router'

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
const showAddButton = computed(() => fightersListStore.getSearchString.length > 0)

const addFighter = () => {
  router.push('/addFighter')
}

watch(searchString, () => {
  fightersList.value = fightersListStore.filteredFightersList
})
</script>

<template>
  <h1 class="flex justify-center mb-4">Список бойцов</h1>
  <SearchWidget
    inputWidth="30%"
    placeholder="Введите имя, город или клуб"
    :store="useFightersListStore"
  />
  <div class="flex flex-wrap gap-5 justify-center w-full p-5">
    <FighterCard
      v-for="fighter in fightersList"
      :key="fighter.id"
      class="grow basis-50 max-w-full lg:max-w-[calc((100%-80px)/5)] min-w-50 p-4"
      :name="`${fighter.surname} ${fighter.name}`"
      :description="`${fighter.city} ${fighter.club || ''}`"
      :pic="fighter.pic"
      @click="router.push(`/fighter/${fighter.id}`)"
    />
  </div>
  <div class="flex justify-center">
    <Button v-show="showAddButton" variant="default" size="default" @click="addFighter"
      >Добавить бойца</Button
    >
  </div>
</template>
