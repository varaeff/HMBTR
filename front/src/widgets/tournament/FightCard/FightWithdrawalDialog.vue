<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { tData } from '@/lib/utils'
import type { Fighter } from '@/model'

const props = defineProps<{
  open: boolean
  fighter: Fighter | null
  reason: string
  isExcused: boolean
  isSaving: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'update:reason', value: string): void
  (e: 'update:isExcused', value: boolean): void
  (e: 'save'): void
}>()

const updateReason = (event: Event) => {
  emit('update:reason', (event.target as HTMLInputElement).value)
}

const canSave = computed(() => !props.isSaving && props.reason.trim().length > 0)

const saveIfAllowed = () => {
  if (canSave.value) {
    emit('save')
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ $t('fighterWithdrawalDialogTitle') }}</DialogTitle>
        <DialogDescription>
          {{ $t('fighterWithdrawalDialogDescription') }}
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-3">
        <div class="text-sm font-medium">
          {{ fighter ? `${tData(fighter.surname)} ${tData(fighter.name)}` : '' }}
        </div>
        <div class="grid gap-2">
          <label class="text-sm font-medium" for="withdrawal-reason">
            {{ $t('fighterWithdrawalReason') }}
          </label>
          <input
            id="withdrawal-reason"
            :value="reason"
            autocomplete="off"
            class="h-9 rounded border bg-background px-2"
            data-testid="withdrawal-reason-input"
            @input="updateReason"
            @keydown.enter.prevent="saveIfAllowed"
          />
        </div>
        <label class="flex items-center gap-2 text-sm">
          <Checkbox
            :model-value="isExcused"
            @update:model-value="emit('update:isExcused', $event === true)"
            @keydown.enter.prevent="saveIfAllowed"
          />
          {{ $t('fighterWithdrawalExcused') }}
        </label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" @click="emit('update:open', false)">
          {{ $t('disciplinaryCardsCancel') }}
        </Button>
        <Button
          type="button"
          :disabled="!canSave"
          data-testid="withdrawal-save-confirm"
          @click="emit('save')"
        >
          {{ $t('disciplinaryCardsSave') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
