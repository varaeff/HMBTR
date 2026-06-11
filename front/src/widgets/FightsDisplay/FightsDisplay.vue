<script setup lang="ts">
import { computed } from 'vue'
import { useTranslation } from 'i18next-vue'
import { useCompetitionStore } from '@/stores/competition'
import { FightCard } from '@/components/ui/fightCard'
import type { BlockData, DisciplinaryCardType } from '@/model'

const props = defineProps<{
  hasAccess: boolean
  canIssueCards?: boolean
  tournamentId?: number
  cardDate?: string
  activeCardTypes?: Partial<Record<number, DisciplinaryCardType>>
  blockId?: number
  blocksData?: BlockData[]
}>()

const emit = defineEmits<{
  (e: 'card-issued'): void
}>()

const competitionStore = useCompetitionStore()
const blocks = computed(() =>
  (props.blocksData ?? competitionStore.getFightsBlocks).filter((block) => block.fights.length > 0)
)

const getGroupLabel = (letters: string[]) => {
  return letters.join(', ')
}

const getGroupTitle = (letters: string[]) => {
  const key = letters.length === 1 ? 'tournamentPageGroupName' : 'tournamentPageGroups'

  return `${i18next.t(key)} ${getGroupLabel(letters)}`
}

const { i18next } = useTranslation()
const languageKey = computed(() => i18next.language)

const handleScoreUpdate = (
  fightId: number,
  fightNumber: number,
  scores: { f1: number; f2: number }
) => {
  competitionStore.updateGlobalScore({
    fightId,
    fightNumber,
    f1Score: scores.f1,
    f2Score: scores.f2
  })
}

</script>

<template>
  <div v-if="blocks.length" class="space-y-6 px-10">
    <div v-for="(block, blockIndex) in blocks" :key="blockIndex" class="space-y-3">
      <h3 class="text-lg font-semibold">
        {{ getGroupTitle(block.letters) }}
      </h3>

      <div class="space-y-2">
        <FightCard
          v-for="fight in block.fights"
          :key="`${blockIndex}-${fight.number}-${languageKey}`"
          :fight="fight"
          :hasAccess="hasAccess"
          :canIssueCards="canIssueCards"
          :tournamentId="tournamentId"
          :cardDate="cardDate"
          :activeCardTypes="activeCardTypes"
          @update:score="(scores) => handleScoreUpdate(fight.id, fight.number, scores)"
          @card-issued="emit('card-issued')"
        />
      </div>
    </div>
  </div>
</template>
