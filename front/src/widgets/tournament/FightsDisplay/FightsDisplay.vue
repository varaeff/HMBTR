<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTranslation } from 'i18next-vue'
import { Checkbox } from '@/components/ui/checkbox'
import { FightCard } from '@/widgets/tournament/FightCard'
import { hasEditableRoundTimeInputs } from '@/widgets/tournament/fightRoundTimeVisibility'
import type { BlockData, TournamentMarshal } from '@/model'
import type {
  ActiveCardTypes,
  CancelWithdrawalAction,
  CreateDisciplinaryCardAction,
  CreateFightWithdrawalAction,
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
  createWithdrawal?: CreateFightWithdrawalAction
  cancelWithdrawal?: CancelWithdrawalAction
  blockId?: number
  blocksData: BlockData[]
  showRoundTimeToggle?: boolean
}>()

const emit = defineEmits<{
  (e: 'card-issued'): void
  (e: 'withdrawal-changed'): void
  (e: 'update-score', payload: FightScoreUpdatePayload): void
}>()

const blocks = computed(() => props.blocksData.filter((block) => block.fights.length > 0))
const roundTimesVisibility = ref<Record<string, boolean>>({})

const getGroupLabel = (letters: string[]) => {
  return letters.join(', ')
}

const visibilityKey = (block: BlockData) => block.letters.join('|')

const isRoundTimesVisible = (block: BlockData) =>
  Boolean(roundTimesVisibility.value[visibilityKey(block)])

const canShowRoundTimeToggle = (block: BlockData) =>
  Boolean(props.showRoundTimeToggle && hasEditableRoundTimeInputs(block.fights))

const setRoundTimesVisible = (block: BlockData, value: unknown) => {
  roundTimesVisibility.value = {
    ...roundTimesVisibility.value,
    [visibilityKey(block)]: value === true
  }
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
      <label
        v-if="canShowRoundTimeToggle(block)"
        class="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Checkbox
          :model-value="isRoundTimesVisible(block)"
          @update:model-value="(value) => setRoundTimesVisible(block, value)"
        />
        {{ $t('tournamentPageShowRoundTimes') }}
      </label>

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
          :createWithdrawal="createWithdrawal"
          :cancelWithdrawal="cancelWithdrawal"
          :show-round-times="isRoundTimesVisible(block)"
          @update:score="(scores) => handleScoreUpdate(fight.id, fight.number, scores)"
          @card-issued="emit('card-issued')"
          @withdrawal-changed="emit('withdrawal-changed')"
        />
      </div>
    </div>
  </div>
</template>
