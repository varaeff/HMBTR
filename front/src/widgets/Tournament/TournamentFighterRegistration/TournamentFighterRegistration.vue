<script setup lang="ts">
import { FightersSelect } from '@/widgets/tournament/FightersSelect'
import type { Nomination, Tournament } from '@/model'

defineProps<{
  tournament: Tournament | null
  canShow: boolean
  nominations: Nomination[]
}>()
</script>

<template>
  <div class="flex flex-col justify-center items-center mb-5" v-if="tournament && canShow">
    <h3 class="mb-4">{{ $t('tournamentPageFightersSelectLabel') }}</h3>
    <FightersSelect :tournamentId="tournament.id" :nominations="nominations" />
  </div>
</template>
