<script setup lang="ts">
import type { RoundScore } from '@shared/fightScoring'
import RoundTimeInput from '@/components/ui/round-time-input/RoundTimeInput.vue'
import type { FighterSide } from './types'

const props = defineProps<{
  visibleRoundScores: RoundScore[]
  canEditScores: boolean
  showRoundTimes: boolean
  highlightTieBreakRequired: boolean
  bonusForScore: (fighter: FighterSide, round?: number) => number
}>()

const emit = defineEmits<{
  (e: 'update-score', fighter: FighterSide, value: string, roundIndex?: number): void
  (e: 'update-round-time', roundIndex: number, durationSeconds: number): void
  (
    e: 'score-blur',
    event: FocusEvent,
    fighter: FighterSide,
    roundIndex: number,
    isLastInput: boolean
  ): void
}>()

const handleKeydown = (event: KeyboardEvent) => {
  const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']

  if (event.key === 'Enter') {
    event.preventDefault()

    const currentElement = event.target as HTMLInputElement
    currentElement.dataset.fightScoreEnterNavigation = 'true'
    const form = currentElement.form || document
    const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input:not([disabled])'))
    const currentIndex = inputs.indexOf(currentElement)

    if (currentIndex > -1 && currentIndex < inputs.length - 1) {
      inputs[currentIndex + 1].focus()
    } else {
      currentElement.blur()
    }
    return
  }

  if (event.key === 'Tab' && !event.shiftKey) {
    const currentElement = event.target as HTMLInputElement
    currentElement.dataset.fightScoreTabNavigation = 'true'
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
  <div class="grid gap-1">
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
        data-fight-score-input="true"
        :data-round-index="roundIndex"
        data-fighter-side="1"
        data-testid="fight-score-input"
        class="h-8 w-14 rounded border text-center outline-none focus:ring-2 disabled:bg-muted disabled:text-muted-foreground"
        :class="
          highlightTieBreakRequired
            ? 'border-red-500 bg-red-50 text-red-700 focus:ring-red-500'
            : 'focus:ring-blue-500'
        "
        :disabled="!canEditScores"
        @keydown="handleKeydown"
        @focus="selectInputContent"
        @click="selectInputContent"
        @input="emit('update-score', 1, ($event.target as HTMLInputElement).value, roundIndex)"
        @blur="emit('score-blur', $event, 1, roundIndex, false)"
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
        data-fight-score-input="true"
        :data-round-index="roundIndex"
        data-fighter-side="2"
        data-testid="fight-score-input"
        class="h-8 w-14 rounded border text-center outline-none focus:ring-2 disabled:bg-muted disabled:text-muted-foreground"
        :class="
          highlightTieBreakRequired
            ? 'border-red-500 bg-red-50 text-red-700 focus:ring-red-500'
            : 'focus:ring-blue-500'
        "
        :disabled="!canEditScores"
        @keydown="handleKeydown"
        @focus="selectInputContent"
        @click="selectInputContent"
        @input="emit('update-score', 2, ($event.target as HTMLInputElement).value, roundIndex)"
        @blur="
          emit('score-blur', $event, 2, roundIndex, roundIndex === visibleRoundScores.length - 1)
        "
        @paste="handlePaste($event, 2, roundIndex)"
      />
      <span class="text-sm font-bold text-red-900">
        {{ bonusForScore(2, roundIndex + 1) > 0 ? `+${bonusForScore(2, roundIndex + 1)}` : '' }}
      </span>
      <label
        v-if="showRoundTimes"
        class="col-span-full ml-9 flex items-center gap-2 text-xs font-medium text-muted-foreground sm:col-span-2 sm:ml-0"
      >
        {{ $t('fightRoundTimeLabel') }}
        <RoundTimeInput
          :model-value="round.durationSeconds ?? 0"
          :disabled="!canEditScores"
          @update:model-value="(value) => emit('update-round-time', roundIndex, value)"
        />
      </label>
    </div>
  </div>
</template>
