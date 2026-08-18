<script setup lang="ts">
import type { RoundScore } from '@shared/fightScoring'
import { formatRoundTime } from '@/lib/roundTime'
import type { FightResultDisplayText, FightWarningResultScore } from './types'

defineProps<{
  warningResultScore: FightWarningResultScore | null
  resultDisplay: FightResultDisplayText
  roundScores: RoundScore[]
  showRoundTimes: boolean
}>()
</script>

<template>
  <div class="text-center">
    <template v-if="warningResultScore">
      <strong v-if="!warningResultScore.leading && warningResultScore.parts[0]">
        <span>{{ warningResultScore.parts[0].competitor1Score }}</span
        ><span v-if="warningResultScore.parts[0].competitor1Bonus > 0" class="text-red-900"
          >+{{ warningResultScore.parts[0].competitor1Bonus }}</span
        >
        <span>:</span>
        <span>{{ warningResultScore.parts[0].competitor2Score }}</span
        ><span v-if="warningResultScore.parts[0].competitor2Bonus > 0" class="text-red-900"
          >+{{ warningResultScore.parts[0].competitor2Bonus }}</span
        >
      </strong>
      <strong v-else>{{ warningResultScore.leading }}</strong>
      <span
        v-if="warningResultScore.leading && warningResultScore.parts.length"
        class="fight-result-details font-normal"
        ><span>(</span
        ><template v-for="(part, index) in warningResultScore.parts" :key="index">
          <span v-if="index > 0">, </span>
          <span>{{ part.competitor1Score }}</span
          ><span v-if="part.competitor1Bonus > 0" class="font-bold text-red-900"
            >+{{ part.competitor1Bonus }}</span
          >
          <span>:</span>
          <span>{{ part.competitor2Score }}</span
          ><span v-if="part.competitor2Bonus > 0" class="font-bold text-red-900"
            >+{{ part.competitor2Bonus }}</span
          > </template
        ><span>)</span></span
      >
    </template>
    <template v-else>
      <strong>{{ resultDisplay.score }}</strong>
      {{ ' ' }}
      <span v-if="resultDisplay.details" class="fight-result-details font-normal">
        {{ resultDisplay.details }}
      </span>
    </template>
    <div v-if="showRoundTimes" class="mt-1 grid gap-0.5 text-xs text-muted-foreground">
      <div
        v-for="(round, index) in roundScores"
        :key="index"
        data-testid="fight-round-time-display"
      >
        <span v-if="roundScores.length > 1" class="mr-1">R{{ index + 1 }}</span
        >{{ $t('fightRoundTimeLabel') }}
        {{ formatRoundTime(round.durationSeconds ?? 0) }}
      </div>
    </div>
  </div>
</template>
