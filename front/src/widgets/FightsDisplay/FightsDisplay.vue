<script setup lang="ts">
import { computed } from 'vue'
import { useTranslation } from 'i18next-vue'
import { useCompetitionStore } from '@/stores/competition'
import { Button } from '@/components/ui/button'
import { FightCard } from '@/components/ui/fightCard'
import type { BlockData, DisciplinaryCardType, FightData } from '@/model'

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
const blocks = computed(() => props.blocksData ?? competitionStore.getFightsBlocks)

const getGroupLabel = (letters: string[]) => {
  return letters.join(', ')
}

const { i18next } = useTranslation()
const languageKey = computed(() => i18next.language)

const handleScoreUpdate = (fightId: number, fightNumber: number, scores: { f1: number; f2: number }) => {
  competitionStore.updateGlobalScore({ fightId, fightNumber, f1Score: scores.f1, f2Score: scores.f2 })
}

const hasUnsavedFights = (block: BlockData) => block.fights.some((fight) => !fight.isFinished)

const isFightReady = (fight: FightData) => {
  if (fight.isFinished) return true

  return (
    !(fight.fighter1Score === 0 && fight.fighter2Score === 0) &&
    fight.fighter1Score !== fight.fighter2Score
  )
}

const canSaveBlock = (block: BlockData) => block.fights.length > 0 && block.fights.every(isFightReady)

const saveBlockResults = (block: BlockData) => {
  const unsavedFights = block.fights.filter((fight) => !fight.isFinished)
  const blockId =
    props.blockId ??
    competitionStore.getBlocks.find((competitionBlock) =>
      competitionBlock.fights.some((fight) => fight.id === unsavedFights[0]?.id)
    )?.id

  if (!blockId) return
  competitionStore.saveFightResults({ blockId, fights: unsavedFights })
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
          :hasAccess="hasAccess && !fight.isFinished"
          :canIssueCards="canIssueCards && !fight.isFinished"
          :tournamentId="tournamentId"
          :cardDate="cardDate"
          :activeCardTypes="activeCardTypes"
          @update:score="(scores) => handleScoreUpdate(fight.id, fight.number, scores)"
          @card-issued="emit('card-issued')"
        />
      </div>

      <div v-if="hasAccess && hasUnsavedFights(block)" class="flex justify-center pt-2">
        <Button :disabled="!canSaveBlock(block)" @click="saveBlockResults(block)">
          {{ $t('tournamentPageSaveResults') }}
        </Button>
      </div>
    </div>
  </div>
</template>
