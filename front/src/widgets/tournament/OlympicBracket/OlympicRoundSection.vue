<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FightCard } from '@/widgets/tournament/FightCard'
import { hasEditableRoundTimeInputs } from '@/widgets/tournament/fightRoundTimeVisibility'
import type { FightData, TournamentMarshal } from '@/model'
import type {
  ActiveCardTypes,
  CreateDisciplinaryCardAction,
  FightScoreUpdatePayload
} from '@/widgets/tournament/types'

const props = withDefaults(
  defineProps<{
    title: string
    round: number
    fights: FightData[]
    resultsFixed: boolean
    hasFightAccess: boolean
    canIssueCards?: boolean
    tournamentId?: number
    cardDate?: string
    activeCardTypes?: ActiveCardTypes
    tournamentMarshals?: TournamentMarshal[]
    createDisciplinaryCard?: CreateDisciplinaryCardAction
    showLifecycle?: boolean
    showActions?: boolean
    canUseBackwardActions?: boolean
    canRecordResults?: boolean
    canCancelResults?: boolean
    canCancelPairs?: boolean
    canRollbackRound?: boolean
    resultFights?: FightData[]
    fixButtonKey?: 'tournamentPageFixResults' | 'tournamentPageFixFinalResults'
  }>(),
  {
    showLifecycle: true,
    showActions: false,
    canUseBackwardActions: false,
    canRecordResults: false,
    canCancelResults: false,
    canCancelPairs: false,
    canRollbackRound: false,
    fixButtonKey: 'tournamentPageFixResults'
  }
)

const emit = defineEmits<{
  (e: 'update-score', payload: FightScoreUpdatePayload): void
  (e: 'card-issued'): void
  (e: 'fix-results', round: number, fights: FightData[]): void
  (e: 'cancel-results-fixation', round: number): void
  (e: 'cancel-pair-fixation', round: number): void
  (e: 'rollback-round', round: number): void
}>()

const resultFightsForAction = computed(() => props.resultFights ?? props.fights)
const canShowRoundTimeToggle = computed(() =>
  !props.resultsFixed && hasEditableRoundTimeInputs(props.fights)
)
const showRoundTimes = ref(false)
const setShowRoundTimes = (value: unknown) => {
  showRoundTimes.value = value === true
}

const updateScore = (
  fight: FightData,
  scores: FightScoreUpdatePayload['scores']
) => {
  emit('update-score', {
    fightId: fight.id,
    fightNumber: fight.number,
    scores
  })
}
</script>

<template>
  <section class="space-y-3">
    <h3 class="text-lg font-semibold">{{ title }}</h3>
    <label v-if="canShowRoundTimeToggle" class="flex items-center gap-2 text-sm text-muted-foreground">
      <Checkbox
        :model-value="showRoundTimes"
        @update:model-value="setShowRoundTimes"
      />
      {{ $t('tournamentPageShowRoundTimes') }}
    </label>
    <div class="space-y-2">
      <FightCard
        v-for="fight in fights"
        :key="fight.id"
        :fight="fight"
        :hasAccess="hasFightAccess && !resultsFixed"
        :canIssueCards="canIssueCards && !resultsFixed"
        :tournamentId="tournamentId"
        :cardDate="cardDate"
        :activeCardTypes="activeCardTypes"
        :tournamentMarshals="tournamentMarshals"
        :createDisciplinaryCard="createDisciplinaryCard"
        :show-round-times="showRoundTimes"
        @update:score="(scores) => updateScore(fight, scores)"
        @card-issued="emit('card-issued')"
      />
    </div>
    <div v-if="showActions" class="flex flex-wrap justify-center gap-3 pt-2">
      <Button
        v-if="hasFightAccess && !resultsFixed"
        :disabled="!canRecordResults"
        @click="emit('fix-results', round, resultFightsForAction)"
      >
        {{ $t(fixButtonKey) }}
      </Button>
      <Button
        v-if="canUseBackwardActions && canCancelResults"
        variant="destructive"
        @click="emit('cancel-results-fixation', round)"
      >
        {{ $t('tournamentPageCancelResultsFixation') }}
      </Button>
      <Button
        v-if="canUseBackwardActions && canCancelPairs"
        variant="destructive"
        @click="emit('cancel-pair-fixation', round)"
      >
        {{ $t('tournamentPageCancelPairFixation') }}
      </Button>
      <Button
        v-if="canUseBackwardActions && canRollbackRound"
        variant="destructive"
        @click="emit('rollback-round', round)"
      >
        {{ $t('tournamentPageReturnPreviousRound') }}
      </Button>
    </div>
  </section>
</template>
