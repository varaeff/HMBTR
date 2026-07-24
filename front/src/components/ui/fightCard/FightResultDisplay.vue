<script setup lang="ts">
import type { FightResultDisplayText, FightWarningResultScore } from './types'

defineProps<{
  rounds: 1 | 2 | 3
  warningResultScore: FightWarningResultScore | null
  resultDisplay: FightResultDisplayText
}>()
</script>

<template>
  <div class="text-center">
    <template v-if="warningResultScore">
      <strong v-if="rounds === 1 && warningResultScore.parts[0]">
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
        v-if="rounds > 1 && warningResultScore.parts.length"
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
  </div>
</template>
