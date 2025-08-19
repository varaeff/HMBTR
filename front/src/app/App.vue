<template>
  <MainMenu />
  <div class="main">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import MainMenu from '@/widgets/MainMenu'
import { useFightersListStore } from '@/app/stores/fightersList'
import { onMounted } from 'vue'

const getFighters = async () => {
  await fightersListStore.getFightersList()
}

const fightersListStore = useFightersListStore()

onMounted(async () => {
  await getFighters()
})
</script>

<style scoped>
.main {
  padding-top: 3rem;
  width: 100%;
  min-height: 100vh;
  background-color: antiquewhite;
  box-sizing: border-box;
}
</style>
