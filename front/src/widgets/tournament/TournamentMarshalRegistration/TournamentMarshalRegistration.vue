<script setup lang="ts">
import { TournamentMarshals } from '@/widgets/marshal/TournamentMarshals'
import type { Tournament } from '@/model'

defineProps<{
  tournament: Tournament | null
  showSelector: boolean
  canManage: boolean
  canEdit: boolean
}>()

const emit = defineEmits<{
  (e: 'update-secretary', value: string): Promise<void> | void
}>()
</script>

<template>
  <TournamentMarshals
    v-if="tournament"
    :tournamentId="tournament.id"
    :secretaryName="tournament.secretary_name ?? ''"
    :showSelector="showSelector"
    :canManage="canManage"
    :canEdit="canEdit"
    @update-secretary="(value) => emit('update-secretary', value)"
  />
</template>
