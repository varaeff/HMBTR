<script setup lang="ts">
import { computed } from 'vue'
import { tData } from '@/lib/utils'
import type { CompetitionPlacement } from '@/model'

const props = defineProps<{
  placements: CompetitionPlacement[]
}>()

const ordered = computed(() => [...props.placements].sort((a, b) => a.place - b.place))
const podiumClass = (place: number) => {
  if (place === 1) return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20'
  if (place === 2) return 'border-slate-300 bg-slate-50 dark:bg-slate-900/30'
  return 'border-amber-600 bg-amber-50 dark:bg-amber-950/20'
}
</script>

<template>
  <section v-if="ordered.length" class="mx-auto my-8 w-full max-w-4xl px-4">
    <h2 class="mb-4 text-center text-2xl font-bold">{{ $t('CompetitionPodiumTopThree') }}</h2>
    <div class="grid gap-4 md:grid-cols-3">
      <div
        v-for="placement in ordered"
        :key="placement.place"
        class="rounded-md border-2 p-5 text-center shadow-sm"
        :class="podiumClass(placement.place)"
      >
        <div class="text-3xl font-black">{{ placement.place }}</div>
        <div class="mt-2 text-lg font-semibold">
          {{ tData(placement.fighter.surname) }} {{ tData(placement.fighter.name) }}
        </div>
        <div class="mt-1 text-sm text-muted-foreground">
          {{ tData(placement.fighter.city)
          }}<span v-if="placement.fighter.club">, {{ tData(placement.fighter.club) }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
