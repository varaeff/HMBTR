<script setup lang="ts">
import { computed } from 'vue'
import { useTranslation } from 'i18next-vue'
import type {
  CompetitionBlock,
  DisciplinaryCardStatus,
  FightData,
  TournamentMarshal
} from '@/model'
import type {
  CreateDisciplinaryCardAction,
  FightScoreUpdatePayload,
  OlympicRoundPayload,
  OlympicRoundResultsPayload,
  OlympicSlotSwapPayload
} from '@/widgets/tournament/types'
import OlympicPendingPairs from './OlympicPendingPairs.vue'
import OlympicRoundSection from './OlympicRoundSection.vue'
import {
  canRecordFights,
  createOlympicBracketView,
  getOlympicRoundLabelKey,
  getRoundState,
  hasLaterRound,
  isRoundResultsFixed
} from './olympicBracketView'

const props = defineProps<{
  block: CompetitionBlock
  hasAccess: boolean
  canUseBackwardActions?: boolean
  canIssueCards?: boolean
  tournamentId?: number
  cardDate?: string
  activeCardTypes?: Partial<Record<number, DisciplinaryCardStatus>>
  tournamentMarshals?: TournamentMarshal[]
  createDisciplinaryCard?: CreateDisciplinaryCardAction
  attachedCardCountByFightId?: Record<number, number>
  isFixingPairs: boolean
}>()

const emit = defineEmits<{
  (e: 'card-issued'): void
  (e: 'update-score', payload: FightScoreUpdatePayload): void
  (e: 'swap-slots', payload: OlympicSlotSwapPayload): void
  (e: 'fix-pairs', blockId: number): void
  (e: 'fix-round-results', payload: OlympicRoundResultsPayload): void
  (e: 'cancel-round-results-fixation', payload: OlympicRoundPayload): void
  (e: 'cancel-pair-fixation', payload: OlympicRoundPayload): void
  (e: 'rollback-round', payload: OlympicRoundPayload): void
  (e: 'rollback-pending-pairs', blockId: number): void
}>()

const { i18next } = useTranslation()
const view = computed(() => createOlympicBracketView(props.block))
const isPendingPairsLocked = computed(
  () => props.block.status !== 'ACTIVE' || !view.value.hasPendingPairs
)

const roundTitle = (fights: FightData[]) => i18next.t(getOlympicRoundLabelKey(fights))
const getRoundResultsFixed = (round: number) => isRoundResultsFixed(props.block, round)
const getRoundPairsFixed = (round: number) => Boolean(getRoundState(props.block, round)?.pairsFixed)
const getRoundHasLaterRound = (round: number) => hasLaterRound(props.block, round)
const isLatestRound = (round: number) => view.value.latestRoundState?.round === round

const fixRoundResults = (round: number, fights: FightData[]) => {
  emit('fix-round-results', {
    blockId: props.block.id,
    round,
    fights
  })
}

const cancelRoundResultsFixation = (round: number) => {
  emit('cancel-round-results-fixation', {
    blockId: props.block.id,
    round
  })
}

const cancelPairFixation = (round: number) => {
  emit('cancel-pair-fixation', {
    blockId: props.block.id,
    round
  })
}

const rollbackRound = (round: number) => {
  emit('rollback-round', {
    blockId: props.block.id,
    round
  })
}

const swapSlots = (sourcePosition: number, targetPosition: number) => {
  emit('swap-slots', {
    blockId: props.block.id,
    sourcePosition,
    targetPosition
  })
}
</script>

<template>
  <div class="w-full space-y-6 px-4">
    <div class="space-y-6 px-6 md:px-10">
      <OlympicRoundSection
        v-for="round in view.preliminaryRounds"
        :key="round.round"
        :title="roundTitle(round.fights)"
        :round="round.round"
        :fights="round.fights"
        :resultsFixed="getRoundResultsFixed(round.round)"
        :hasFightAccess="hasAccess && block.status === 'ACTIVE'"
        :canIssueCards="canIssueCards"
        :tournamentId="tournamentId"
        :cardDate="cardDate"
        :activeCardTypes="activeCardTypes"
        :tournamentMarshals="tournamentMarshals"
        :createDisciplinaryCard="createDisciplinaryCard"
        :showActions="(hasAccess || canUseBackwardActions) && isLatestRound(round.round)"
        :canUseBackwardActions="canUseBackwardActions"
        :canRecordResults="canRecordFights(round.fights)"
        :canCancelResults="getRoundResultsFixed(round.round) && !getRoundHasLaterRound(round.round)"
        :canCancelPairs="getRoundPairsFixed(round.round) && !getRoundResultsFixed(round.round)"
        :canRollbackRound="
          round.round > 1 &&
          !getRoundPairsFixed(round.round) &&
          !getRoundResultsFixed(round.round)
        "
        @update-score="(payload) => emit('update-score', payload)"
        @card-issued="emit('card-issued')"
        @fix-results="fixRoundResults"
        @cancel-results-fixation="cancelRoundResultsFixation"
        @cancel-pair-fixation="cancelPairFixation"
        @rollback-round="rollbackRound"
      />

      <OlympicRoundSection
        v-if="view.bronzeFights.length"
        :title="$t('tournamentPageBronzeFight')"
        :round="view.mainRoundsCount"
        :fights="view.bronzeFights"
        :resultsFixed="getRoundResultsFixed(view.mainRoundsCount)"
        :hasFightAccess="hasAccess && block.status === 'ACTIVE'"
        :canIssueCards="canIssueCards"
        :tournamentId="tournamentId"
        :cardDate="cardDate"
        :activeCardTypes="activeCardTypes"
        :tournamentMarshals="tournamentMarshals"
        :createDisciplinaryCard="createDisciplinaryCard"
        :showLifecycle="false"
        @update-score="(payload) => emit('update-score', payload)"
        @card-issued="emit('card-issued')"
      />

      <OlympicRoundSection
        v-if="view.finalRound"
        :title="roundTitle(view.finalRound.fights)"
        :round="view.finalRound.round"
        :fights="view.finalRound.fights"
        :resultFights="view.finalBoundaryFights"
        :resultsFixed="getRoundResultsFixed(view.finalRound.round)"
        :hasFightAccess="hasAccess && block.status === 'ACTIVE'"
        :canIssueCards="canIssueCards"
        :tournamentId="tournamentId"
        :cardDate="cardDate"
        :activeCardTypes="activeCardTypes"
        :tournamentMarshals="tournamentMarshals"
        :createDisciplinaryCard="createDisciplinaryCard"
        :showActions="
          (hasAccess || canUseBackwardActions) && isLatestRound(view.finalRound.round)
        "
        :canUseBackwardActions="canUseBackwardActions"
        :canRecordResults="canRecordFights(view.finalBoundaryFights)"
        :canCancelResults="getRoundResultsFixed(view.finalRound.round)"
        :canRollbackRound="!getRoundResultsFixed(view.finalRound.round)"
        fixButtonKey="tournamentPageFixFinalResults"
        @update-score="(payload) => emit('update-score', payload)"
        @card-issued="emit('card-issued')"
        @fix-results="fixRoundResults"
        @cancel-results-fixation="cancelRoundResultsFixation"
        @rollback-round="rollbackRound"
      />
    </div>

    <OlympicPendingPairs
      v-if="view.hasPendingPairs"
      :slotPairs="view.slotPairs"
      :hasAccess="hasAccess"
      :canUseBackwardActions="canUseBackwardActions"
      :isLocked="isPendingPairsLocked"
      :isFixingPairs="isFixingPairs"
      :latestRound="view.latestRoundState?.round"
      :activeCardTypes="activeCardTypes"
      @swap-slots="swapSlots"
      @fix-pairs="emit('fix-pairs', block.id)"
      @rollback-pending-pairs="emit('rollback-pending-pairs', block.id)"
    />
  </div>
</template>
