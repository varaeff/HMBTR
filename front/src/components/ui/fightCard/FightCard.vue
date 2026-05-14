<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
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

const sanitizeScore = (value: string) => {
  const digitsOnly = value.replace(/\D/g, '')

  return digitsOnly === '' ? 0 : Number.parseInt(digitsOnly, 10)
}

const updateScore = (fighter: 1 | 2, value: string) => {
  const normalizedValue = sanitizeScore(value)

  if (fighter === 1) {
    score1.value = normalizedValue
    return
  }

  score2.value = normalizedValue
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

const handleBlur = (event: Event, fighter: 1 | 2) => {
  const input = event.target as HTMLInputElement
  const normalizedValue = sanitizeScore(input.value)

  updateScore(fighter, input.value)
  input.value = normalizedValue.toString()
}

// Переменная для хранения ID таймера
let timeoutId: ReturnType<typeof setTimeout> | null = null

// Реализация debounce функции
const debouncedEmit = () => {
  if (timeoutId) clearTimeout(timeoutId)

  timeoutId = setTimeout(() => {
    emit('update:score', {
      f1: score1.value,
      f2: score2.value
    })
  }, 600)
}

// Следим за изменениями локальных полей
watch([score1, score2], () => {
  debouncedEmit()
})

// Синхронизация при внешнем обновлении пропсов
watch(
  () => props.fight,
  (newVal) => {
    score1.value = newVal.fighter1Score
    score2.value = newVal.fighter2Score
  },
  { deep: true }
)

// Очистка таймера при уничтожении компонента
onBeforeUnmount(() => {
  if (timeoutId) clearTimeout(timeoutId)
})
</script>

<template>
  <div class="flex items-center gap-4 py-1 px-3 border rounded-lg bg-card">
    <div class="w-8 text-sm text-slate-400 font-semibold">{{ fight.number }}.</div>

    <div class="flex-1 text-sm font-medium">
      {{ fight.fighter1.surname }} — {{ fight.fighter2.surname }}
    </div>

    <div class="flex items-center gap-2">
      <template v-if="hasAccess">
        <input
          :value="score1"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          class="w-14 h-8 border rounded text-center focus:ring-2 focus:ring-blue-500 outline-none"
          @keydown="handleKeydown"
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
          class="w-14 h-8 border rounded text-center focus:ring-2 focus:ring-blue-500 outline-none"
          @keydown="handleKeydown"
          @input="updateScore(2, ($event.target as HTMLInputElement).value)"
          @blur="handleBlur($event, 2)"
          @paste="handlePaste($event, 2)"
        />
      </template>
      <strong v-else class="w-14 text-center">{{ score2 }}</strong>
    </div>
  </div>
</template>
