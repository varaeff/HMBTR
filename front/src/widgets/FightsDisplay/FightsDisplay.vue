<script setup lang="ts">
import { computed } from 'vue'
import { useTranslation } from 'i18next-vue'
import { useCompetitionStore } from '@/stores/competition'
import { FightCard } from '@/components/ui/fightCard'

defineProps<{
  hasAccess: boolean
}>()

const competitionStore = useCompetitionStore()
const blocks = computed(() => competitionStore.getFightsBlocks)

const getGroupLabel = (letters: string[]) => {
  return letters.join(', ')
}

const { i18next } = useTranslation()
const languageKey = computed(() => i18next.language)

const handleScoreUpdate = (fightId: number, fightNumber: number, scores: { f1: number; f2: number }) => {
  competitionStore.updateGlobalScore({ fightId, fightNumber, f1Score: scores.f1, f2Score: scores.f2 })
}
</script>

<template>
  <div v-if="blocks.length" class="space-y-6 px-10">
    <div v-for="(block, blockIndex) in blocks" :key="blockIndex" class="space-y-3">
      <h3 class="text-lg font-semibold">
        {{ $t('tournamentPageGroups') }} {{ getGroupLabel(block.letters) }}
      </h3>

      <div class="space-y-2">
        <FightCard
          v-for="fight in block.fights"
          :key="`${blockIndex}-${fight.number}-${languageKey}`"
          :fight="fight"
          :hasAccess="hasAccess"
          @update:score="(scores) => handleScoreUpdate(fight.id, fight.number, scores)"
        />
      </div>
    </div>
  </div>
</template>
