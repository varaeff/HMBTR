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
import { tData } from '@/lib/utils'
import type { DisciplinaryCardType, Fighter } from '@/model'

defineProps<{
  open: boolean
  fighter: Fighter | null
  type: DisciplinaryCardType
  date: string
  reason: string
  isIssuing: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'update:type', value: DisciplinaryCardType): void
  (e: 'update:reason', value: string): void
  (e: 'issue'): void
}>()

const updateType = (event: Event) => {
  emit('update:type', (event.target as HTMLSelectElement).value as DisciplinaryCardType)
}

const updateReason = (event: Event) => {
  emit('update:reason', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ $t('disciplinaryCardsIssueTitle') }}</DialogTitle>
        <DialogDescription>
          {{ $t('disciplinaryCardsIssueDescription') }}
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-3">
        <div class="text-sm font-medium">
          {{ fighter ? `${tData(fighter.surname)} ${tData(fighter.name)}` : '' }}
        </div>
        <div class="grid gap-2">
          <label class="text-sm font-medium" for="card-type">{{
            $t('disciplinaryCardsType')
          }}</label>
          <select
            id="card-type"
            :value="type"
            class="h-9 rounded border bg-background px-2"
            @change="updateType"
          >
            <option value="YELLOW">{{ $t('disciplinaryCardsYellow') }}</option>
            <option value="RED">{{ $t('disciplinaryCardsRed') }}</option>
          </select>
        </div>
        <div class="grid gap-2">
          <label class="text-sm font-medium" for="card-date">{{
            $t('disciplinaryCardsDate')
          }}</label>
          <input
            id="card-date"
            :value="date"
            type="date"
            disabled
            class="h-9 rounded border bg-muted px-2 text-muted-foreground"
          />
        </div>
        <div class="grid gap-2">
          <label class="text-sm font-medium" for="card-reason">{{
            $t('disciplinaryCardsReason')
          }}</label>
          <input
            id="card-reason"
            :value="reason"
            autocomplete="off"
            class="h-9 rounded border bg-background px-2"
            @input="updateReason"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" @click="emit('update:open', false)">{{
          $t('disciplinaryCardsCancel')
        }}</Button>
        <Button type="button" :disabled="isIssuing || !reason.trim()" @click="emit('issue')">
          {{ $t('disciplinaryCardsSave') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
