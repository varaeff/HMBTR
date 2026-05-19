<script setup lang="ts">
import { computed } from 'vue'
import { useTranslation } from 'i18next-vue'
import type { DisciplinaryCardType } from '@/model'

const props = defineProps<{
  type?: DisciplinaryCardType
}>()

const { i18next } = useTranslation()
const title = computed(() =>
  props.type === 'RED'
    ? i18next.t('disciplinaryCardsActiveRed')
    : i18next.t('disciplinaryCardsActiveYellow')
)
</script>

<template>
  <span
    v-if="type"
    class="inline-flex h-4 w-3 shrink-0 items-center justify-center rounded-[2px] border align-middle"
    :class="
      type === 'RED'
        ? 'border-red-700 bg-red-600'
        : 'border-yellow-600 bg-yellow-300'
    "
    :title="title"
    aria-hidden="true"
  />
</template>
