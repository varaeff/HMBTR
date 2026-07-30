<script setup lang="ts">
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { TournamentCardsTable } from '@/widgets/DisciplinaryCards'
import type { DisciplinaryCard, Tournament, TournamentMarshal } from '@/model'

defineProps<{
  tournament: Tournament | null
  cards: DisciplinaryCard[]
  isOpen: boolean
  canManage: boolean
  canDelete: boolean
  tournamentMarshals: TournamentMarshal[]
}>()

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
  (e: 'changed'): void
}>()
</script>

<template>
  <CollapsibleSection
    v-if="tournament && cards.length"
    :title="$t('disciplinaryCardsTitle')"
    :isOpen="isOpen"
    @update:isOpen="(value) => emit('update:isOpen', value)"
  >
    <TournamentCardsTable
      :cards="cards"
      :canManage="canManage"
      :canDelete="canDelete"
      :tournamentMarshals="tournamentMarshals"
      @changed="emit('changed')"
    />
  </CollapsibleSection>
</template>
