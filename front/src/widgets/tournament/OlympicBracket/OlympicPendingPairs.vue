<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTranslation } from 'i18next-vue'
import { Button } from '@/components/ui/button'
import { tData } from '@/lib/utils'
import { CardStatusIcon, formatActiveDisciplinaryCardTitle } from '@/widgets/tournament/DisciplinaryCards'
import WithdrawalStatusIcon from '@/widgets/tournament/WithdrawalStatusIcon.vue'
import type { ActiveDisciplinaryCardSummary, BracketSlot } from '@/model'
import type { ActiveCardTypes } from '@/widgets/tournament/types'

const props = defineProps<{
  slotPairs: BracketSlot[][]
  hasAccess: boolean
  canUseBackwardActions?: boolean
  isLocked: boolean
  isFixingPairs: boolean
  latestRound?: number
  activeCardTypes?: ActiveCardTypes
}>()

const emit = defineEmits<{
  (e: 'swap-slots', sourcePosition: number, targetPosition: number): void
  (e: 'fix-pairs'): void
  (e: 'rollback-pending-pairs'): void
}>()

const draggedSlot = ref<number | null>(null)
const { i18next } = useTranslation()
const currentLanguage = computed(() => i18next.language)
const cardTitle = (card: ActiveDisciplinaryCardSummary) =>
  formatActiveDisciplinaryCardTitle(card, currentLanguage.value, (key) => i18next.t(key))

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
            <span
              v-for="card in activeCardTypes?.[slot.fighter.id] ?? []"
              :key="card.id"
              :title="cardTitle(card)"
              class="inline-flex"
            >
              <CardStatusIcon :type="card" :showTitle="false" />
            </span>
            <WithdrawalStatusIcon :withdrawal="slot.fighter.withdrawal" />
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
