<script setup lang="ts">
import { computed } from 'vue'
import { useTranslation } from 'i18next-vue'
import { TriangleAlert } from 'lucide-vue-next'
import type { ActiveWithdrawalSummary } from '@/model'

const props = defineProps<{
  withdrawal?: ActiveWithdrawalSummary | null
}>()

const { i18next } = useTranslation()
const title = computed(() =>
  props.withdrawal
    ? i18next.t('fighterWithdrawalMarkerTitle', { reason: props.withdrawal.reason })
    : undefined
)
</script>

<template>
  <span
    v-if="withdrawal"
    class="inline-flex shrink-0 align-middle"
    :title="title"
    aria-hidden="true"
  >
    <TriangleAlert
      class="h-[19px] w-[19px]"
      :class="withdrawal.isExcused ? 'text-muted-foreground' : 'text-red-700'"
      :stroke-width="3"
      aria-hidden="true"
    />
  </span>
</template>
