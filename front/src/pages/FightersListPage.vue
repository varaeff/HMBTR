<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import type { Fighter } from '@/shared/model'
import { useFightersListStore } from '@/stores/fightersList'
import FighterCard from '@/components/FighterCard.vue'
import SeachComponent from '@/components/SeachComponent.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const fightersList = ref([] as Fighter[])
const fightersListStore = useFightersListStore()

const getFighters = async () => {
  if (fightersListStore.fighters.length < 2) {
    try {
      await fightersListStore.getFightersList()
    } catch (error) {
      console.error('Error loading fighters:', error)
    }
  }

  const data: Fighter[] = fightersListStore.filteredFightersList
  return data
}

onMounted(async () => {
  fightersListStore.seachString = ''
  fightersList.value = await getFighters()
})

const seachString = computed(() => fightersListStore.seachString)

const addFighter = () => {
  router.push('/addFighter')
}

watch(seachString, () => {
  fightersList.value = fightersListStore.filteredFightersList
})
</script>

<template>
  <h1 class="title">Список бойцов</h1>
  <div class="title">
    <SeachComponent
      :placeholder="'Введите имя, город или клуб'"
      :clearBtn="true"
      :btnTitle="'Очистить поиск'"
      :width="30"
      :store="useFightersListStore"
    />
  </div>
  <div class="fightersList">
    <FighterCard
      v-for="fighter in fightersList"
      :key="fighter.id"
      :name="`${fighter.surname} ${fighter.name}`"
      :description="`${fighter.city} ${fighter.club || ''}`"
      :pic="fighter.pic"
      @click="router.push(`/fighter/${fighter.id}`)"
    />
  </div>
  <div class="bottom-btn">
    <button class="btn btn-primary-accent btn-large" @click="addFighter">Добавить бойца</button>
  </div>
</template>

<style scoped>
.fightersList {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: flex-start;
  width: 100%;
  padding: 20px;
}

.fightersList > * {
  flex: 0 1 calc((100% - 80px) / 5);
  min-width: 200px;
  max-width: calc((100% - 80px) / 5);
}
</style>
