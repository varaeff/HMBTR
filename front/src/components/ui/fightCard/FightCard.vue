<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import type { FightData } from '@/model'

const props = defineProps<{
  fight: FightData
}>()

const emit = defineEmits<{
  (e: 'update:score', payload: { f1: number; f2: number }): void
}>()

const score1 = ref(props.fight.fighter1Score)
const score2 = ref(props.fight.fighter2Score)

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
      <input
        v-model.number="score1"
        type="number"
        min="0"
        class="w-14 h-8 border rounded text-center focus:ring-2 focus:ring-blue-500 outline-none"
      />
      <span class="font-bold">:</span>
      <input
        v-model.number="score2"
        type="number"
        min="0"
        class="w-14 h-8 border rounded text-center focus:ring-2 focus:ring-blue-500 outline-none"
      />
    </div>
  </div>
</template>
