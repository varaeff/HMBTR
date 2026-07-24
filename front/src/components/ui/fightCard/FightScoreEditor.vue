<script setup lang="ts">
import type { RoundScore } from '@shared/fightScoring'
import type { FighterSide } from './types'

const props = defineProps<{
  rounds: 1 | 2 | 3
  score1: number
  score2: number
  visibleRoundScores: RoundScore[]
  canEditScores: boolean
  isTieScore: boolean
  bonusForScore: (fighter: FighterSide, round?: number) => number
}>()

const emit = defineEmits<{
  (e: 'update-score', fighter: FighterSide, value: string, roundIndex?: number): void
  (e: 'score-blur', event: Event, fighter: FighterSide, roundIndex?: number): void
}>()

const handleKeydown = (event: KeyboardEvent) => {
  const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']

  if (event.key === 'Enter') {
    event.preventDefault()

    const currentElement = event.target as HTMLInputElement
    const form = currentElement.form || document
    const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input:not([disabled])'))
    const currentIndex = inputs.indexOf(currentElement)

    if (currentIndex > -1 && currentIndex < inputs.length - 1) {
      inputs[currentIndex + 1].focus()
    }
    return
  }

  if (allowedKeys.includes(event.key) || event.ctrlKey || event.metaKey) {
    return
  }

  if (!/^\d$/.test(event.key)) {
    event.preventDefault()
  }
}

const handlePaste = (event: ClipboardEvent, fighter: FighterSide, roundIndex?: number) => {
  event.preventDefault()

  const pastedText = event.clipboardData?.getData('text') ?? ''
  emit('update-score', fighter, pastedText, roundIndex)
}

const selectInputContent = (event: Event) => {
  ;(event.target as HTMLInputElement).select()
}
</script>

<template>
  <template v-if="rounds === 1">
    <span class="inline-flex min-w-20 items-center justify-end gap-1">
      <input
        :value="score1"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        class="w-14 h-8 border rounded text-center focus:ring-2 outline-none disabled:bg-muted disabled:text-muted-foreground"
        :class="
          isTieScore
            ? 'border-red-500 bg-red-50 text-red-700 focus:ring-red-500'
            : 'focus:ring-blue-500'
        "
        :disabled="!canEditScores"
        @keydown="handleKeydown"
        @focus="selectInputContent"
        @click="selectInputContent"
        @input="emit('update-score', 1, ($event.target as HTMLInputElement).value)"
        @blur="emit('score-blur', $event, 1)"
        @paste="handlePaste($event, 1)"
      />
      <span v-if="bonusForScore(1) > 0" class="font-bold text-red-900">
        +{{ bonusForScore(1) }}
      </span>
    </span>
    <span class="font-bold">:</span>
    <span class="inline-flex min-w-20 items-center gap-1">
      <input
        :value="score2"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        class="w-14 h-8 border rounded text-center focus:ring-2 outline-none disabled:bg-muted disabled:text-muted-foreground"
        :class="
          isTieScore
            ? 'border-red-500 bg-red-50 text-red-700 focus:ring-red-500'
            : 'focus:ring-blue-500'
        "
        :disabled="!canEditScores"
        @keydown="handleKeydown"
        @focus="selectInputContent"
        @click="selectInputContent"
        @input="emit('update-score', 2, ($event.target as HTMLInputElement).value)"
        @blur="emit('score-blur', $event, 2)"
        @paste="handlePaste($event, 2)"
      />
      <span v-if="bonusForScore(2) > 0" class="font-bold text-red-900">
        +{{ bonusForScore(2) }}
      </span>
    </span>
  </template>

  <div v-else class="grid gap-1">
    <div
      v-for="(round, roundIndex) in visibleRoundScores"
      :key="roundIndex"
      class="grid grid-cols-[1.75rem_3.5rem_2.25rem_auto_3.5rem_2.25rem] items-center gap-2"
    >
      <span class="text-xs font-semibold text-muted-foreground">R{{ roundIndex + 1 }}</span>
      <input
        :value="round.competitor1Score"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        class="h-8 w-14 rounded border text-center outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-muted disabled:text-muted-foreground"
        :disabled="!canEditScores"
        @keydown="handleKeydown"
        @focus="selectInputContent"
        @click="selectInputContent"
        @input="emit('update-score', 1, ($event.target as HTMLInputElement).value, roundIndex)"
        @blur="emit('score-blur', $event, 1, roundIndex)"
        @paste="handlePaste($event, 1, roundIndex)"
      />
      <span class="text-sm font-bold text-red-900">
        {{ bonusForScore(1, roundIndex + 1) > 0 ? `+${bonusForScore(1, roundIndex + 1)}` : '' }}
      </span>
      <span class="font-bold">:</span>
      <input
        :value="round.competitor2Score"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        class="h-8 w-14 rounded border text-center outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-muted disabled:text-muted-foreground"
        :disabled="!canEditScores"
        @keydown="handleKeydown"
        @focus="selectInputContent"
        @click="selectInputContent"
        @input="emit('update-score', 2, ($event.target as HTMLInputElement).value, roundIndex)"
        @blur="emit('score-blur', $event, 2, roundIndex)"
        @paste="handlePaste($event, 2, roundIndex)"
      />
      <span class="text-sm font-bold text-red-900">
        {{ bonusForScore(2, roundIndex + 1) > 0 ? `+${bonusForScore(2, roundIndex + 1)}` : '' }}
      </span>
    </div>
  </div>
</template>
