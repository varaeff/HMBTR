<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

defineProps<{
  open: boolean
  rounds: 1 | 2 | 3
  issueRounds: number[]
  selectedRound: number
  reason: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'update:selectedRound', value: number): void
  (e: 'update:reason', value: string): void
  (e: 'confirm'): void
}>()

const updateReason = (event: Event) => {
  emit('update:reason', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ $t('fightWarningIssueReasonTitle') }}</DialogTitle>
        <DialogDescription>
          {{ $t('fightWarningIssueReasonDescription') }}
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-3">
        <div v-if="rounds > 1" class="grid gap-2">
          <label
            v-for="round in issueRounds"
            :key="round"
            class="flex cursor-pointer items-center gap-2 text-sm"
          >
            <input
              :checked="selectedRound === round"
              type="radio"
              :value="round"
              @change="emit('update:selectedRound', round)"
            />
            <span>{{ $t('fightWarningRoundLabel', { round }) }}</span>
          </label>
        </div>
        <div class="grid gap-2">
          <label class="text-sm font-medium" for="warning-reason">
            {{ $t('fightWarningReasonLabel') }}
          </label>
          <input
            id="warning-reason"
            :value="reason"
            autocomplete="off"
            class="h-9 rounded border bg-background px-2"
            data-testid="fight-warning-reason-input"
            @input="updateReason"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" @click="emit('update:open', false)">
          {{ $t('disciplinaryCardsCancel') }}
        </Button>
        <Button
          type="button"
          :disabled="!reason.trim()"
          data-testid="fight-warning-issue-confirm"
          @click="emit('confirm')"
        >
          {{ $t('fightWarningIssueAction') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
