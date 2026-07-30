<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { useCompetitionStore } from '@/stores/competition'
import { tData } from '@/lib/utils'

const competitionStore = useCompetitionStore()
const pendingTie = computed(() => competitionStore.getPendingTie)
const tiedFighters = computed(() => {
  const ids = new Set(pendingTie.value?.competitorIds ?? [])
  const groupId = pendingTie.value?.groupId
  const blockId = pendingTie.value?.blockId
  const groups = competitionStore.getBlocks
    .filter((block) => blockId === undefined || block.id === blockId)
    .flatMap((block) => block.groups)
  const group = groupId === null ? null : groups.find((group) => group.id === groupId)

  if (groupId !== null && !group) return []

  const seen = new Set<number>()
  const fighters = group ? group.fighters : groups.flatMap((group) => group.fighters)

  return fighters.filter((fighter) => {
    if (!fighter.competitorId || !ids.has(fighter.competitorId) || seen.has(fighter.competitorId)) {
      return false
    }

    seen.add(fighter.competitorId)
    return true
  })
})
const order = ref<number[]>([])

watch(
  tiedFighters,
  (fighters) => {
    order.value = fighters.map((fighter) => fighter.competitorId!).filter(Boolean)
  },
  { immediate: true }
)

const move = (index: number, direction: -1 | 1) => {
  const target = index + direction
  if (target < 0 || target >= order.value.length) return
  const next = [...order.value]
  ;[next[index], next[target]] = [next[target], next[index]]
  order.value = next
}

const fighterByCompetitorId = (competitorId: number) =>
  tiedFighters.value.find((fighter) => fighter.competitorId === competitorId)

const save = () => {
  if (!pendingTie.value) return
  competitionStore.resolveTie(pendingTie.value, order.value)
}
</script>

<template>
  <div v-if="pendingTie" class="mx-auto my-4 max-w-xl rounded-md border bg-card p-4 shadow-sm">
    <h3 class="mb-3 text-center text-base font-semibold">{{ $t('tieResolverResolveTie') }}</h3>
    <div class="space-y-2">
      <div
        v-for="(competitorId, index) in order"
        :key="competitorId"
        class="flex items-center justify-between gap-3 rounded border px-3 py-2"
      >
        <div class="text-sm font-medium">
          {{ index + 1 }}.
          <template v-if="fighterByCompetitorId(competitorId)">
            {{ tData(fighterByCompetitorId(competitorId)!.surname) }}
            {{ tData(fighterByCompetitorId(competitorId)!.name) }}
          </template>
        </div>
        <div class="flex gap-2">
          <Button variant="outline" size="sm" :disabled="index === 0" @click="move(index, -1)">
            {{ $t('tieResolverUp') }}
          </Button>
          <Button
            variant="outline"
            size="sm"
            :disabled="index === order.length - 1"
            @click="move(index, 1)"
          >
            {{ $t('tieResolverDown') }}
          </Button>
        </div>
      </div>
    </div>
    <div class="mt-4 flex justify-center">
      <Button @click="save">{{ $t('tieResolverSaveOrder') }}</Button>
    </div>
  </div>
</template>
