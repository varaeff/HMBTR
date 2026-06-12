<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTranslation } from 'i18next-vue'

import { useCompetitionStore } from '@/stores/competition'

import { Button } from '@/components/ui/button'
import { FightCard } from '@/components/ui/fightCard'

import { tData } from '@/lib/utils'

import type { BracketSlot, CompetitionBlock, DisciplinaryCardType, FightData } from '@/model'
import type { RoundScore } from '@shared/fightScoring'
import { CardStatusIcon } from '@/widgets/DisciplinaryCards'
import { AlertWidget } from '@/widgets/AlertWidget'

const props = defineProps<{
  block: CompetitionBlock
  hasAccess: boolean
  canIssueCards?: boolean
  tournamentId?: number
  cardDate?: string
  activeCardTypes?: Partial<Record<number, DisciplinaryCardType>>
  attachedCardCountByFightId?: Record<number, number>
}>()

const emit = defineEmits<{
  (e: 'card-issued'): void
  (e: 'lifecycle-changed'): void
}>()

const competitionStore = useCompetitionStore()
const draggedSlot = ref<number | null>(null)
const isFixingPairs = ref(false)
const { i18next } = useTranslation()
const backwardConfirmation = ref<{
  mainText: string
  action: () => Promise<void>
} | null>(null)

const closeBackwardConfirmation = () => {
  backwardConfirmation.value = null
}

const requestBackwardConfirmation = (mainText: string, action: () => Promise<void>) => {
  backwardConfirmation.value = { mainText, action }
}

const runConfirmedBackwardAction = async () => {
  const action = backwardConfirmation.value?.action
  closeBackwardConfirmation()
  await action?.()
}

const rounds = computed(() => {
  const roundMap = new Map<number, typeof props.block.fights>()
  props.block.fights
    .filter((fight) => !fight.isBronze)
    .forEach((fight) => {
      const round = fight.bracketRound ?? 1
      roundMap.set(round, [...(roundMap.get(round) ?? []), fight])
    })

  return [...roundMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([round, fights]) => ({
      round,
      fights: fights.sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0))
    }))
})

const mainRoundsCount = computed(() => Math.log2(props.block.bracketSlots.length))
const semifinalRound = computed(() => mainRoundsCount.value - 1)
const mainFights = computed(() => props.block.fights.filter((fight) => !fight.isBronze))
const latestRoundState = computed(() =>
  [...props.block.roundStates].sort((a, b) => b.round - a.round)[0]
)
const getRoundState = (round: number) =>
  props.block.roundStates.find((state) => state.round === round)
const isRoundResultsFixed = (round: number) => Boolean(getRoundState(round)?.resultsFixed)
const hasLaterRound = (round: number) => props.block.roundStates.some((state) => state.round > round)

const getFightWinnerCompetitorId = (fight: FightData) => {
  if (!fight.isFinished || !fight.winnerId) return null
  return fight.winnerId
}

const pendingPairSlots = computed(() => {
  const sortedSlots = [...props.block.bracketSlots].sort((a, b) => a.slotPosition - b.slotPosition)
  if (!latestRoundState.value || latestRoundState.value.pairsFixed) return []

  if (!mainFights.value.length) return sortedSlots
  if (!Number.isInteger(mainRoundsCount.value)) return []

  const latestRound = Math.max(...mainFights.value.map((fight) => fight.bracketRound ?? 1))
  if (latestRound >= semifinalRound.value) return []

  const nextRound = latestRound + 1
  if (mainFights.value.some((fight) => (fight.bracketRound ?? 1) === nextRound)) return []

  const latestRoundFights = mainFights.value.filter(
    (fight) => (fight.bracketRound ?? 1) === latestRound
  )
  const winnerIds = latestRoundFights.map(getFightWinnerCompetitorId)

  if (winnerIds.some((winnerId) => winnerId === null)) return []

  const winnerSet = new Set(winnerIds.filter((winnerId): winnerId is number => winnerId !== null))

  return sortedSlots.filter((slot) => winnerSet.has(slot.competitorId))
})

const hasPendingPairs = computed(() => pendingPairSlots.value.length > 0)
const isLocked = computed(() => props.block.status !== 'ACTIVE' || !hasPendingPairs.value)

const slotPairs = computed(() => {
  const slots = pendingPairSlots.value
  const pairs: BracketSlot[][] = []

  for (let i = 0; i < slots.length; i += 2) {
    pairs.push(slots.slice(i, i + 2))
  }

  return pairs
})

const bronzeFights = computed(() => props.block.fights.filter((fight) => fight.isBronze))

const finalRound = computed(() => {
  const sortedRounds = [...rounds.value].sort((a, b) => b.round - a.round)

  return sortedRounds.find((round) => round.fights.length === 1) ?? null
})

const preliminaryRounds = computed(() => {
  if (!finalRound.value) return rounds.value

  return rounds.value.filter((round) => round.round !== finalRound.value?.round)
})

const roundLabel = (fights: CompetitionBlock['fights']) => {
  switch (fights.length) {
    case 8:
      return i18next.t('tournamentPage1_8Final')
    case 4:
      return i18next.t('tournamentPage1_4Final')
    case 2:
      return i18next.t('tournamentPageSemifinals')
    case 1:
      return i18next.t('tournamentPageFinal')
    default:
      return i18next.t('tournamentPageRound')
  }
}

const handleScoreUpdate = (
  fightId: number,
  fightNumber: number,
  scores: {
    f1?: number
    f2?: number
    roundScores?: RoundScore[]
    tieBreakRoundRevealed?: boolean
  }
) => {
  competitionStore.updateGlobalScore({
    fightId,
    fightNumber,
    f1Score: scores.f1,
    f2Score: scores.f2,
    roundScores: scores.roundScores,
    tieBreakRoundRevealed: scores.tieBreakRoundRevealed
  })
}

const isFightReady = (fight: FightData) => {
  return fight.isResultValid
}

const canRecordFights = (fights: FightData[]) => fights.length > 0 && fights.every(isFightReady)

const dropOnSlot = (targetPosition: number) => {
  if (!draggedSlot.value || isLocked.value || draggedSlot.value === targetPosition) {
    draggedSlot.value = null
    return
  }

  competitionStore.swapBracketSlots(props.block.id, draggedSlot.value, targetPosition)
  draggedSlot.value = null
}

const fixPairs = async () => {
  if (isFixingPairs.value || !hasPendingPairs.value) return

  isFixingPairs.value = true
  try {
    await competitionStore.generateOlympicFights(props.block.id)
  } finally {
    isFixingPairs.value = false
    emit('lifecycle-changed')
  }
}

const fixRoundResults = async (round: number, fights: FightData[]) => {
  try {
    await competitionStore.fixResults(props.block.id, fights, round)
  } finally {
    emit('lifecycle-changed')
  }
}

const cancelRoundResultsFixation = async (round: number) => {
  requestBackwardConfirmation(i18next.t('tournamentPageConfirmCancelResultsFixation'), async () => {
    try {
      await competitionStore.cancelResultsFixation(props.block.id, round)
    } finally {
      emit('lifecycle-changed')
    }
  })
}

const cancelPairFixation = async (round: number) => {
  requestBackwardConfirmation(
    i18next.t('tournamentPageConfirmCancelPairFixation', getDeletionCounts(round)),
    async () => {
      try {
        await competitionStore.cancelFightsFixation(props.block.id, round)
      } finally {
        emit('lifecycle-changed')
      }
    }
  )
}

const rollbackRound = async (round: number) => {
  requestBackwardConfirmation(
    i18next.t('tournamentPageConfirmReturnPreviousRound', getDeletionCounts(round)),
    async () => {
      try {
        await competitionStore.rollback(props.block.id, round)
      } finally {
        emit('lifecycle-changed')
      }
    }
  )
}

const rollbackPendingPairs = async () => {
  const round = latestRoundState.value?.round ?? 1
  const confirmationKey =
    latestRoundState.value?.round && latestRoundState.value.round > 1
      ? 'tournamentPageConfirmReturnPreviousRound'
      : 'tournamentPageConfirmReturnPreviousStage'
  requestBackwardConfirmation(
    i18next.t(confirmationKey, getDeletionCounts(round)),
    async () => {
      if (latestRoundState.value?.round && latestRoundState.value.round > 1) {
        try {
          await competitionStore.rollback(props.block.id, latestRoundState.value.round)
        } finally {
          emit('lifecycle-changed')
        }
        return
      }
      try {
        await competitionStore.rollback(props.block.id)
      } finally {
        emit('lifecycle-changed')
      }
    }
  )
}

const getDeletionCounts = (round: number) => {
  const fights = props.block.fights.filter(
    (fight) =>
      fight.bracketRound === round ||
      (round === mainRoundsCount.value && fight.isBronze)
  )
  return {
    fights: fights.length,
    cards: fights.reduce(
      (total, fight) => total + (props.attachedCardCountByFightId?.[fight.id] ?? 0),
      0
    )
  }
}

const finalBoundaryFights = computed(() => [
  ...(finalRound.value?.fights ?? []),
  ...bronzeFights.value
])
</script>

<template>
  <Teleport to="body">
    <AlertWidget
      v-if="backwardConfirmation"
      class="fixed inset-0 z-99999 flex items-center justify-center"
      :isError="false"
      :title="$t('tournamentPageBackwardConfirmationTitle')"
      :mainText="backwardConfirmation.mainText"
      :showInput="false"
      :buttonAction="runConfirmedBackwardAction"
      :closeAction="closeBackwardConfirmation"
      :cancelAction="closeBackwardConfirmation"
      :buttonText="$t('tournamentPageConfirmBackwardAction')"
      :cancelText="$t('fighterPageCancelButton')"
      buttonVariant="destructive"
    />
  </Teleport>

  <div class="w-full space-y-6 px-4">
    <div class="space-y-6 px-6 md:px-10">
      <section v-for="round in preliminaryRounds" :key="round.round" class="space-y-3">
        <h3 class="text-lg font-semibold">{{ roundLabel(round.fights) }}</h3>
        <div class="text-sm text-muted-foreground">
          {{
            $t(
              isRoundResultsFixed(round.round)
                ? 'tournamentPageLifecycleRESULTS_FIXED'
                : 'tournamentPageLifecycleFIGHTS_EDITABLE'
            )
          }}
        </div>
        <div class="space-y-2">
          <FightCard
            v-for="fight in round.fights"
            :key="fight.id"
            :fight="fight"
            :hasAccess="
              hasAccess &&
              block.status === 'ACTIVE' &&
              !isRoundResultsFixed(round.round)
            "
            :canIssueCards="canIssueCards && !isRoundResultsFixed(round.round)"
            :tournamentId="tournamentId"
            :cardDate="cardDate"
            :activeCardTypes="activeCardTypes"
            @update:score="(scores) => handleScoreUpdate(fight.id, fight.number, scores)"
            @card-issued="emit('card-issued')"
          />
        </div>
        <div
          v-if="hasAccess && latestRoundState?.round === round.round"
          class="flex flex-wrap justify-center gap-3 pt-2"
        >
          <Button
            v-if="!isRoundResultsFixed(round.round)"
            :disabled="!canRecordFights(round.fights)"
            @click="fixRoundResults(round.round, round.fights)"
          >
            {{ $t('tournamentPageFixResults') }}
          </Button>
          <Button
            v-if="isRoundResultsFixed(round.round) && !hasLaterRound(round.round)"
            variant="destructive"
            @click="cancelRoundResultsFixation(round.round)"
          >
            {{ $t('tournamentPageCancelResultsFixation') }}
          </Button>
          <Button
            v-if="getRoundState(round.round)?.pairsFixed && !isRoundResultsFixed(round.round)"
            variant="destructive"
            @click="cancelPairFixation(round.round)"
          >
            {{ $t('tournamentPageCancelPairFixation') }}
          </Button>
          <Button
            v-if="
              round.round > 1 &&
              !getRoundState(round.round)?.pairsFixed &&
              !isRoundResultsFixed(round.round)
            "
            variant="destructive"
            @click="rollbackRound(round.round)"
          >
            {{ $t('tournamentPageReturnPreviousRound') }}
          </Button>
        </div>
      </section>

      <section v-if="bronzeFights.length" class="space-y-3">
        <h3 class="text-lg font-semibold">{{ $t('tournamentPageBronzeFight') }}</h3>
        <div class="space-y-2">
          <FightCard
            v-for="fight in bronzeFights"
            :key="fight.id"
            :fight="fight"
            :hasAccess="
              hasAccess &&
              block.status === 'ACTIVE' &&
              !isRoundResultsFixed(mainRoundsCount)
            "
            :canIssueCards="canIssueCards && !isRoundResultsFixed(mainRoundsCount)"
            :tournamentId="tournamentId"
            :cardDate="cardDate"
            :activeCardTypes="activeCardTypes"
            @update:score="(scores) => handleScoreUpdate(fight.id, fight.number, scores)"
            @card-issued="emit('card-issued')"
          />
        </div>
      </section>

      <section v-if="finalRound" class="space-y-3">
        <h3 class="text-lg font-semibold">{{ roundLabel(finalRound.fights) }}</h3>
        <div class="text-sm text-muted-foreground">
          {{
            $t(
              isRoundResultsFixed(finalRound.round)
                ? 'tournamentPageLifecycleRESULTS_FIXED'
                : 'tournamentPageLifecycleFIGHTS_EDITABLE'
            )
          }}
        </div>
        <div class="space-y-2">
          <FightCard
            v-for="fight in finalRound.fights"
            :key="fight.id"
            :fight="fight"
            :hasAccess="
              hasAccess &&
              block.status === 'ACTIVE' &&
              !isRoundResultsFixed(finalRound.round)
            "
            :canIssueCards="canIssueCards && !isRoundResultsFixed(finalRound.round)"
            :tournamentId="tournamentId"
            :cardDate="cardDate"
            :activeCardTypes="activeCardTypes"
            @update:score="(scores) => handleScoreUpdate(fight.id, fight.number, scores)"
            @card-issued="emit('card-issued')"
          />
        </div>
      </section>
      <div
        v-if="hasAccess && finalRound && latestRoundState?.round === finalRound.round"
        class="flex flex-wrap justify-center gap-3"
      >
        <Button
          v-if="!isRoundResultsFixed(finalRound.round)"
          :disabled="!canRecordFights(finalBoundaryFights)"
          @click="fixRoundResults(finalRound.round, finalBoundaryFights)"
        >
          {{ $t('tournamentPageFixFinalResults') }}
        </Button>
        <Button
          v-if="isRoundResultsFixed(finalRound.round)"
          variant="destructive"
          @click="cancelRoundResultsFixation(finalRound.round)"
        >
          {{ $t('tournamentPageCancelResultsFixation') }}
        </Button>
        <Button
          v-if="!isRoundResultsFixed(finalRound.round)"
          variant="destructive"
          @click="rollbackRound(finalRound.round)"
        >
          {{ $t('tournamentPageReturnPreviousRound') }}
        </Button>
      </div>
    </div>

    <div v-if="hasPendingPairs" class="text-center text-sm text-muted-foreground">
      {{ $t('tournamentPageLifecycleFORMATION_EDITABLE') }}
    </div>

    <div v-if="hasPendingPairs" class="mx-auto flex max-w-5xl flex-wrap justify-center gap-3">
      <div
        v-for="pair in slotPairs"
        :key="pair.map((slot) => slot.id).join('-')"
        class="w-full max-w-64 rounded-md border border-border bg-muted/70 p-2 shadow-md sm:w-64 dark:bg-muted/50"
        @dragover.prevent
      >
        <div class="space-y-2 fighters-pair">
          <div
            v-for="slot in pair"
            :key="slot.id"
            class="rounded-md border bg-background px-3 py-2 text-center text-xs transition-colors"
            :class="[
              hasAccess && !isLocked ? 'cursor-move hover:bg-accent/50' : 'cursor-default',
              draggedSlot === slot.slotPosition ? 'opacity-40' : ''
            ]"
            :draggable="hasAccess && !isLocked"
            @dragstart="draggedSlot = slot.slotPosition"
            @dragend="draggedSlot = null"
            @dragover.prevent
            @drop="dropOnSlot(slot.slotPosition)"
          >
            <div class="font-semibold leading-tight">
              {{ tData(slot.fighter.surname) }} {{ tData(slot.fighter.name) }}
              <CardStatusIcon :type="activeCardTypes?.[slot.fighter.id]" />
            </div>
            <div class="mt-1 text-muted-foreground">
              {{ tData(slot.fighter.city)
              }}<span v-if="slot.fighter.club">, {{ tData(slot.fighter.club) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="hasAccess && hasPendingPairs" class="flex justify-center">
      <Button :disabled="isFixingPairs" @click="fixPairs">
        {{ $t('tournamentPageFixPairs') }}
      </Button>
    </div>
    <div
      v-if="hasAccess && hasPendingPairs"
      class="flex justify-center"
    >
      <Button
        variant="destructive"
        @click="rollbackPendingPairs"
      >
        {{
          $t(
            latestRoundState?.round && latestRoundState.round > 1
              ? 'tournamentPageReturnPreviousRound'
              : 'tournamentPageReturnPreviousStage'
          )
        }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
.fighters-pair > div {
  position: relative;
}

.fighters-pair > div:not(:first-child) {
  margin-top: 1.75rem !important;
}

.fighters-pair > div:not(:first-child)::before {
  content: 'VS';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: -1.5rem;
  font-weight: 700;
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  pointer-events: none;
}
</style>
