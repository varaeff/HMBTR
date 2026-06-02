<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTranslation } from 'i18next-vue'

import { useCompetitionStore } from '@/stores/competition'

import { Button } from '@/components/ui/button'
import { FightCard } from '@/components/ui/fightCard'

import { tData } from '@/lib/utils'

import type { BracketSlot, CompetitionBlock, DisciplinaryCardType, FightData } from '@/model'
import { CardStatusIcon } from '@/widgets/DisciplinaryCards'

const props = defineProps<{
  block: CompetitionBlock
  hasAccess: boolean
  canIssueCards?: boolean
  tournamentId?: number
  cardDate?: string
  activeCardTypes?: Partial<Record<number, DisciplinaryCardType>>
}>()

const emit = defineEmits<{
  (e: 'card-issued'): void
}>()

const competitionStore = useCompetitionStore()
const draggedSlot = ref<number | null>(null)
const isFixingPairs = ref(false)
const { i18next } = useTranslation()

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

const getFightWinnerCompetitorId = (fight: FightData) => {
  if (!fight.isFinished || !fight.competitor1Id || !fight.competitor2Id) return null
  if (fight.fighter1Score === fight.fighter2Score) return null

  return fight.fighter1Score > fight.fighter2Score ? fight.competitor1Id : fight.competitor2Id
}

const pendingPairSlots = computed(() => {
  const sortedSlots = [...props.block.bracketSlots].sort((a, b) => a.slotPosition - b.slotPosition)

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
  scores: { f1: number; f2: number }
) => {
  competitionStore.updateGlobalScore({
    fightId,
    fightNumber,
    f1Score: scores.f1,
    f2Score: scores.f2
  })
}

const hasUnsavedFights = (fights: FightData[]) => fights.some((fight) => !fight.isFinished)

const isFightReady = (fight: FightData) => {
  if (fight.isFinished) return true

  return (
    !(fight.fighter1Score === 0 && fight.fighter2Score === 0) &&
    fight.fighter1Score !== fight.fighter2Score
  )
}

const canSaveFights = (fights: FightData[]) => fights.length > 0 && fights.every(isFightReady)

const saveResults = (fights: FightData[]) => {
  competitionStore.saveFightResults({
    blockId: props.block.id,
    fights: fights.filter((fight) => !fight.isFinished)
  })
}

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
  }
}
</script>

<template>
  <div class="w-full space-y-6 px-4">
    <div class="space-y-6 px-6 md:px-10">
      <section v-for="round in preliminaryRounds" :key="round.round" class="space-y-3">
        <h3 class="text-lg font-semibold">{{ roundLabel(round.fights) }}</h3>
        <div class="space-y-2">
          <FightCard
            v-for="fight in round.fights"
            :key="fight.id"
            :fight="fight"
            :hasAccess="hasAccess && block.status === 'ACTIVE' && !fight.isFinished"
            :canIssueCards="canIssueCards && !fight.isFinished"
            :tournamentId="tournamentId"
            :cardDate="cardDate"
            :activeCardTypes="activeCardTypes"
            @update:score="(scores) => handleScoreUpdate(fight.id, fight.number, scores)"
            @card-issued="emit('card-issued')"
          />
        </div>
        <div v-if="hasAccess && hasUnsavedFights(round.fights)" class="flex justify-center pt-2">
          <Button :disabled="!canSaveFights(round.fights)" @click="saveResults(round.fights)">
            {{ $t('tournamentPageSaveResults') }}
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
            :hasAccess="hasAccess && block.status === 'ACTIVE' && !fight.isFinished"
            :canIssueCards="canIssueCards && !fight.isFinished"
            :tournamentId="tournamentId"
            :cardDate="cardDate"
            :activeCardTypes="activeCardTypes"
            @update:score="(scores) => handleScoreUpdate(fight.id, fight.number, scores)"
            @card-issued="emit('card-issued')"
          />
        </div>
        <div v-if="hasAccess && hasUnsavedFights(bronzeFights)" class="flex justify-center pt-2">
          <Button :disabled="!canSaveFights(bronzeFights)" @click="saveResults(bronzeFights)">
            {{ $t('tournamentPageSaveResults') }}
          </Button>
        </div>
      </section>

      <section v-if="finalRound" class="space-y-3">
        <h3 class="text-lg font-semibold">{{ roundLabel(finalRound.fights) }}</h3>
        <div class="space-y-2">
          <FightCard
            v-for="fight in finalRound.fights"
            :key="fight.id"
            :fight="fight"
            :hasAccess="hasAccess && block.status === 'ACTIVE' && !fight.isFinished"
            :canIssueCards="canIssueCards && !fight.isFinished"
            :tournamentId="tournamentId"
            :cardDate="cardDate"
            :activeCardTypes="activeCardTypes"
            @update:score="(scores) => handleScoreUpdate(fight.id, fight.number, scores)"
            @card-issued="emit('card-issued')"
          />
        </div>
        <div
          v-if="hasAccess && hasUnsavedFights(finalRound.fights)"
          class="flex justify-center pt-2"
        >
          <Button
            :disabled="!canSaveFights(finalRound.fights)"
            @click="saveResults(finalRound.fights)"
          >
            {{ $t('tournamentPageSaveResults') }}
          </Button>
        </div>
      </section>
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
