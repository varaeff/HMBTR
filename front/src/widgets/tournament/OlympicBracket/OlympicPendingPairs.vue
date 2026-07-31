<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { tData } from '@/lib/utils'
import { CardStatusIcon } from '@/widgets/tournament/DisciplinaryCards'
import type { BracketSlot, DisciplinaryCardStatus } from '@/model'

const props = defineProps<{
  slotPairs: BracketSlot[][]
  hasAccess: boolean
  canUseBackwardActions?: boolean
  isLocked: boolean
  isFixingPairs: boolean
  latestRound?: number
  activeCardTypes?: Partial<Record<number, DisciplinaryCardStatus>>
}>()

const emit = defineEmits<{
  (e: 'swap-slots', sourcePosition: number, targetPosition: number): void
  (e: 'fix-pairs'): void
  (e: 'rollback-pending-pairs'): void
}>()

const draggedSlot = ref<number | null>(null)

const dropOnSlot = (targetPosition: number) => {
  if (!draggedSlot.value || props.isLocked || draggedSlot.value === targetPosition) {
    draggedSlot.value = null
    return
  }

  emit('swap-slots', draggedSlot.value, targetPosition)
  draggedSlot.value = null
}
</script>

<template>
  <div class="text-center text-sm text-muted-foreground">
    {{ $t('tournamentPageLifecycleFORMATION_EDITABLE') }}
  </div>

  <div class="mx-auto flex max-w-5xl flex-wrap justify-center gap-3">
    <div
      v-for="pair in slotPairs"
      :key="pair.map((slot) => slot.id).join('-')"
      class="w-full max-w-64 rounded-md border border-border bg-muted/70 p-2 shadow-md sm:w-64 dark:bg-muted/50"
      @dragover.prevent
    >
      <div class="space-y-2 fighters-pair">
        <div
          v-for="slot in pair"
          :key="slot.id"
          class="rounded-md border bg-background px-3 py-2 text-center text-xs transition-colors"
          :class="[
            hasAccess && !isLocked ? 'cursor-move hover:bg-accent/50' : 'cursor-default',
            draggedSlot === slot.slotPosition ? 'opacity-40' : ''
          ]"
          :draggable="hasAccess && !isLocked"
          @dragstart="draggedSlot = slot.slotPosition"
          @dragend="draggedSlot = null"
          @dragover.prevent
          @drop="dropOnSlot(slot.slotPosition)"
        >
          <div class="font-semibold leading-tight">
            {{ tData(slot.fighter.surname) }} {{ tData(slot.fighter.name) }}
            <CardStatusIcon :type="activeCardTypes?.[slot.fighter.id]" />
          </div>
          <div class="mt-1 text-muted-foreground">
            {{ tData(slot.fighter.city)
            }}<span v-if="slot.fighter.club">, {{ tData(slot.fighter.club) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="hasAccess" class="flex justify-center">
    <Button :disabled="isFixingPairs" @click="emit('fix-pairs')">
      {{ $t('tournamentPageFixPairs') }}
    </Button>
  </div>
  <div v-if="canUseBackwardActions" class="flex justify-center">
    <Button variant="destructive" @click="emit('rollback-pending-pairs')">
      {{
        $t(
          latestRound && latestRound > 1
            ? 'tournamentPageReturnPreviousRound'
            : 'tournamentPageReturnPreviousStage'
        )
      }}
    </Button>
  </div>
</template>

<style scoped>
.fighters-pair > div {
  position: relative;
}

.fighters-pair > div:not(:first-child) {
  margin-top: 1.75rem !important;
}

.fighters-pair > div:not(:first-child)::before {
  content: 'VS';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: -1.5rem;
  font-weight: 700;
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  pointer-events: none;
}
</style>
