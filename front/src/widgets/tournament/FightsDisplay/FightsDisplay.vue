<script setup lang="ts">
import { computed } from 'vue'
import { useTranslation } from 'i18next-vue'
import { FightCard } from '@/widgets/tournament/FightCard'
import type { BlockData, TournamentMarshal } from '@/model'
import type {
  ActiveCardTypes,
  CreateDisciplinaryCardAction,
  FightScoreDraftUpdate,
  FightScoreUpdatePayload
} from '@/widgets/tournament/types'

const props = defineProps<{
  hasAccess: boolean
  canIssueCards?: boolean
  tournamentId?: number
  cardDate?: string
  activeCardTypes?: ActiveCardTypes
  tournamentMarshals?: TournamentMarshal[]
  createDisciplinaryCard?: CreateDisciplinaryCardAction
  blockId?: number
  blocksData: BlockData[]
}>()

const emit = defineEmits<{
  (e: 'card-issued'): void
  (e: 'update-score', payload: FightScoreUpdatePayload): void
}>()

const blocks = computed(() => props.blocksData.filter((block) => block.fights.length > 0))

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
  scores: FightScoreDraftUpdate
) => {
  emit('update-score', {
    fightId,
    fightNumber,
    scores
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
          :tournamentMarshals="tournamentMarshals"
          :createDisciplinaryCard="createDisciplinaryCard"
          @update:score="(scores) => handleScoreUpdate(fight.id, fight.number, scores)"
          @card-issued="emit('card-issued')"
        />
      </div>
    </div>
  </div>
</template>
