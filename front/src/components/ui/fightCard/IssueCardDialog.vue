<script setup lang="ts">
import { watch } from 'vue'
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
import type { DisciplinaryCardType, Fighter, TournamentMarshal } from '@/model'

const props = defineProps<{
  open: boolean
  fighter: Fighter | null
  type: DisciplinaryCardType
  date: string
  reason: string
  marshalId: number | null
  tournamentMarshals: TournamentMarshal[]
  isIssuing: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'update:type', value: DisciplinaryCardType): void
  (e: 'update:reason', value: string): void
  (e: 'update:marshalId', value: number | null): void
  (e: 'issue'): void
}>()

const updateType = (event: Event) => {
  emit('update:type', (event.target as HTMLSelectElement).value as DisciplinaryCardType)
}

const updateReason = (event: Event) => {
  emit('update:reason', (event.target as HTMLInputElement).value)
}

const updateMarshal = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  emit('update:marshalId', value ? Number(value) : null)
}

const marshalLabel = (item: TournamentMarshal) =>
  `${tData(item.marshal.surname)} ${tData(item.marshal.name)}`

watch(
  () => [props.open, props.marshalId, props.tournamentMarshals] as const,
  ([open, marshalId, tournamentMarshals]) => {
    if (open && !marshalId && tournamentMarshals[0]) {
      emit('update:marshalId', tournamentMarshals[0].marshal_id)
    }
  },
  { immediate: true }
)

const issueFromReasonInput = (event: KeyboardEvent) => {
  const inputReason = (event.target as HTMLInputElement).value
  if (!props.isIssuing && props.marshalId && (inputReason.trim() || props.reason.trim())) {
    emit('issue')
  }
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
          <label class="text-sm font-medium" for="card-marshal">{{
            $t('disciplinaryCardsMarshal')
          }}</label>
          <select
            id="card-marshal"
            :value="marshalId ?? ''"
            class="h-9 rounded border bg-background px-2"
            data-testid="card-marshal-select"
            @change="updateMarshal"
          >
            <option
              v-for="item in tournamentMarshals"
              :key="item.marshal_id"
              :value="item.marshal_id"
            >
              {{ marshalLabel(item) }}
            </option>
          </select>
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
            data-testid="card-reason-input"
            @input="updateReason"
            @keydown.enter.prevent="issueFromReasonInput"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" @click="emit('update:open', false)">{{
          $t('disciplinaryCardsCancel')
        }}</Button>
        <Button
          type="button"
          :disabled="isIssuing || !reason.trim() || !marshalId"
          data-testid="card-issue-confirm"
          @click="emit('issue')"
        >
          {{ $t('disciplinaryCardsSave') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
