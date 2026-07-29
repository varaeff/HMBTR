<script setup lang="ts">
import { TournamentMarshals } from '@/widgets/TournamentMarshals'
import type { Tournament } from '@/model'

defineProps<{
  tournament: Tournament | null
  showSelector: boolean
  canManage: boolean
}>()

const emit = defineEmits<{
  (e: 'finished'): void
}>()
</script>

<template>
  <TournamentMarshals
    v-if="tournament"
    :tournamentId="tournament.id"
    :showSelector="showSelector"
    :canManage="canManage"
    @finished="emit('finished')"
  />
</template>
