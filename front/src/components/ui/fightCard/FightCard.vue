<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTranslation } from 'i18next-vue'
import { tData } from '@/lib/utils'
import type { FightData } from '@/model'

const props = defineProps<{
  fight: FightData
  hasAccess: boolean
}>()

const emit = defineEmits<{
  (e: 'update:score', payload: { f1: number; f2: number }): void
}>()

const score1 = ref(props.fight.fighter1Score)
const score2 = ref(props.fight.fighter2Score)
const { i18next } = useTranslation()

const isTieScore = computed(
  () =>
    props.hasAccess && score1.value === score2.value && !(score1.value === 0 && score2.value === 0)
)

const currentLanguage = computed(() => i18next.language)
const fighter1Surname = computed(() => tData(props.fight.fighter1.surname, currentLanguage.value))
const fighter2Surname = computed(() => tData(props.fight.fighter2.surname, currentLanguage.value))

const sanitizeScore = (value: string) => {
  const digitsOnly = value.replace(/\D/g, '')

  return digitsOnly === '' ? 0 : Number.parseInt(digitsOnly, 10)
}

const updateScore = (fighter: 1 | 2, value: string) => {
  const normalizedValue = sanitizeScore(value)
  const currentValue = fighter === 1 ? score1.value : score2.value

  if (fighter === 1) {
    score1.value = normalizedValue
  } else {
    score2.value = normalizedValue
  }

  if (currentValue !== normalizedValue) {
    emit('update:score', {
      f1: score1.value,
      f2: score2.value
    })
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']

  if (allowedKeys.includes(event.key) || event.ctrlKey || event.metaKey) {
    return
  }

  if (!/^\d$/.test(event.key)) {
    event.preventDefault()
  }
}

const handlePaste = (event: ClipboardEvent, fighter: 1 | 2) => {
  event.preventDefault()

  const pastedText = event.clipboardData?.getData('text') ?? ''
  updateScore(fighter, pastedText)
}

const selectInputContent = (event: Event) => {
  ;(event.target as HTMLInputElement).select()
}

const handleBlur = (event: Event, fighter: 1 | 2) => {
  const input = event.target as HTMLInputElement
  const normalizedValue = sanitizeScore(input.value)

  updateScore(fighter, input.value)
  input.value = normalizedValue.toString()
}

watch(
  () => props.fight,
  (newVal) => {
    if (score1.value !== newVal.fighter1Score) score1.value = newVal.fighter1Score
    if (score2.value !== newVal.fighter2Score) score2.value = newVal.fighter2Score
  },
  { deep: true }
)
</script>

<template>
  <div class="flex items-center gap-4 py-1 px-3 border rounded-lg bg-card">
    <div class="w-8 text-sm text-slate-400 font-semibold">{{ fight.number }}.</div>

    <div class="flex-1 text-sm font-medium">{{ fighter1Surname }} - {{ fighter2Surname }}</div>

    <div class="flex items-center gap-2">
      <template v-if="hasAccess">
        <input
          :value="score1"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          class="w-14 h-8 border rounded text-center focus:ring-2 outline-none"
          :class="
            isTieScore
              ? 'border-red-500 bg-red-50 text-red-700 focus:ring-red-500'
              : 'focus:ring-blue-500'
          "
          @keydown="handleKeydown"
          @focus="selectInputContent"
          @click="selectInputContent"
          @input="updateScore(1, ($event.target as HTMLInputElement).value)"
          @blur="handleBlur($event, 1)"
          @paste="handlePaste($event, 1)"
        />
      </template>
      <strong v-else class="w-14 text-center">{{ score1 }}</strong>
      <span class="font-bold">:</span>
      <template v-if="hasAccess">
        <input
          :value="score2"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          class="w-14 h-8 border rounded text-center focus:ring-2 outline-none"
          :class="
            isTieScore
              ? 'border-red-500 bg-red-50 text-red-700 focus:ring-red-500'
              : 'focus:ring-blue-500'
          "
          @keydown="handleKeydown"
          @focus="selectInputContent"
          @click="selectInputContent"
          @input="updateScore(2, ($event.target as HTMLInputElement).value)"
          @blur="handleBlur($event, 2)"
          @paste="handlePaste($event, 2)"
        />
      </template>
      <strong v-else class="w-14 text-center">{{ score2 }}</strong>
    </div>
  </div>
</template>
