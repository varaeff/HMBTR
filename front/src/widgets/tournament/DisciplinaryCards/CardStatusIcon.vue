<script setup lang="ts">
import { computed } from 'vue'
import { useTranslation } from 'i18next-vue'
import type { DisciplinaryCardStatus, DisciplinaryCardType } from '@/model'

const props = defineProps<{
  type?: DisciplinaryCardType | DisciplinaryCardStatus
  title?: string
  showTitle?: boolean
}>()

const { i18next } = useTranslation()
const status = computed<DisciplinaryCardStatus | null>(() => {
  if (!props.type) return null
  return typeof props.type === 'string' ? { type: props.type, active: true } : props.type
})
const title = computed(() => {
  if (props.title) return props.title
  if (!status.value) return undefined

  return status.value.type === 'RED'
    ? status.value.active
      ? i18next.t('disciplinaryCardsActiveRed')
      : i18next.t('disciplinaryCardsInactiveRed')
    : status.value.active
      ? i18next.t('disciplinaryCardsActiveYellow')
      : i18next.t('disciplinaryCardsInactiveYellow')
})
const visibleTitle = computed(() => (props.showTitle === false ? undefined : title.value))
</script>

<template>
  <span
    v-if="status"
    class="inline-flex h-4 w-3 shrink-0 items-center justify-center rounded-[2px] border align-middle"
    :class="
      status.type === 'RED'
        ? status.active
          ? 'border-red-700 bg-red-600'
          : 'border-red-300 bg-red-200 opacity-60'
        : status.active
          ? 'border-yellow-600 bg-yellow-300'
          : 'border-yellow-300 bg-yellow-100 opacity-60'
    "
    :title="visibleTitle"
    aria-hidden="true"
  />
</template>
