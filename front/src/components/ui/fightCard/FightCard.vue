<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTranslation } from 'i18next-vue'
import { useDisciplinaryCardsStore } from '@/stores/disciplinaryCards'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { CardStatusIcon } from '@/widgets/DisciplinaryCards'
import { tData } from '@/lib/utils'
import type { DisciplinaryCardType, FightData, Fighter } from '@/model'
import { evaluateFightScore, formatFightResult, type RoundScore } from '@shared/fightScoring'

const props = defineProps<{
  fight: FightData
  hasAccess: boolean
  canIssueCards?: boolean
  tournamentId?: number
  cardDate?: string
  activeCardTypes?: Partial<Record<number, DisciplinaryCardType>>
}>()

const emit = defineEmits<{
  (
    e: 'update:score',
    payload: {
      f1?: number
      f2?: number
      roundScores?: RoundScore[]
      tieBreakRoundRevealed?: boolean
    }
  ): void
  (e: 'card-issued'): void
}>()

const score1 = ref(props.fight.fighter1Score)
const score2 = ref(props.fight.fighter2Score)
const roundScores = ref<RoundScore[]>(props.fight.roundScores.map((score) => ({ ...score })))
const tieBreakRoundRevealed = ref(Boolean(props.fight.tieBreakRoundRevealed))
const { i18next } = useTranslation()
const cardsStore = useDisciplinaryCardsStore()
const issueDialogOpen = ref(false)
const issueFighter = ref<Fighter | null>(null)
const issueType = ref<DisciplinaryCardType>('YELLOW')
const issueDate = ref(new Date().toISOString().slice(0, 10))
const issueReason = ref('')
const isIssuing = ref(false)

const canEdit = computed(() => props.hasAccess && !props.fight.isFinished)
const evaluation = computed(() =>
  evaluateFightScore(
    { rounds: props.fight.rounds, roundWin: props.fight.roundWin },
    props.fight.rounds === 1 ? [] : roundScores.value,
    props.fight.rounds === 1
      ? { competitor1Score: score1.value, competitor2Score: score2.value }
      : undefined
  )
)
const isTieScore = computed(
  () =>
    canEdit.value &&
    props.fight.rounds === 1 &&
    score1.value === score2.value &&
    !(score1.value === 0 && score2.value === 0)
)
const resultText = computed(() =>
  formatFightResult(
    { rounds: props.fight.rounds, roundWin: props.fight.roundWin },
    props.fight.forfeitCardId
      ? {
          ...evaluation.value,
          competitor1Total: props.fight.fighter1Score,
          competitor2Total: props.fight.fighter2Score
        }
      : evaluation.value,
    roundScores.value,
    Boolean(props.fight.forfeitCardId)
  )
)
const resultDisplay = computed(() => {
  const detailsStart = resultText.value.indexOf(' (')

  return detailsStart === -1
    ? { score: resultText.value, details: '' }
    : {
        score: resultText.value.slice(0, detailsStart),
        details: resultText.value.slice(detailsStart + 1)
      }
})
const visibleRoundScores = computed(() =>
  props.fight.roundWin && !tieBreakRoundRevealed.value
    ? roundScores.value.slice(0, 3)
    : roundScores.value
)

const currentLanguage = computed(() => i18next.language)
const fighter1Surname = computed(() => tData(props.fight.fighter1.surname, currentLanguage.value))
const fighter2Surname = computed(() => tData(props.fight.fighter2.surname, currentLanguage.value))
const fighter1CardType = computed(() => props.activeCardTypes?.[props.fight.fighter1.id])
const fighter2CardType = computed(() => props.activeCardTypes?.[props.fight.fighter2.id])
const cardDate = computed(() => props.cardDate ?? new Date().toISOString().slice(0, 10))

const sanitizeScore = (value: string) => {
  const digitsOnly = value.replace(/\D/g, '')

  return digitsOnly === '' ? 0 : Number.parseInt(digitsOnly, 10)
}

const emitScoreUpdate = () => {
  if (props.fight.rounds === 1) {
    emit('update:score', { f1: score1.value, f2: score2.value })
    return
  }

  emit('update:score', {
    roundScores: roundScores.value.map((score) => ({ ...score })),
    tieBreakRoundRevealed: tieBreakRoundRevealed.value
  })
}

const updateScore = (fighter: 1 | 2, value: string, roundIndex?: number) => {
  const normalizedValue = sanitizeScore(value)
  const currentValue =
    roundIndex === undefined
      ? fighter === 1
        ? score1.value
        : score2.value
      : fighter === 1
        ? roundScores.value[roundIndex].competitor1Score
        : roundScores.value[roundIndex].competitor2Score

  if (roundIndex !== undefined && fighter === 1) {
    roundScores.value[roundIndex].competitor1Score = normalizedValue
  } else if (roundIndex !== undefined) {
    roundScores.value[roundIndex].competitor2Score = normalizedValue
  } else if (fighter === 1) {
    score1.value = normalizedValue
  } else {
    score2.value = normalizedValue
  }

  if (
    props.fight.roundWin &&
    tieBreakRoundRevealed.value &&
    !evaluateFightScore(
      { rounds: 3, roundWin: true },
      roundScores.value.slice(0, 3)
    ).requiresTieBreakRound
  ) {
    tieBreakRoundRevealed.value = false
    roundScores.value = roundScores.value.slice(0, 3)
  }

  if (currentValue !== normalizedValue) {
    emitScoreUpdate()
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']

  if (event.key === 'Enter') {
    event.preventDefault()

    const currentElement = event.target as HTMLInputElement
    const form = currentElement.form || document

    if (form) {
      const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input:not([disabled])'))

      const currentIndex = inputs.indexOf(currentElement)
      if (currentIndex > -1 && currentIndex < inputs.length - 1) {
        inputs[currentIndex + 1].focus()
      }
    }
    return
  }

  if (allowedKeys.includes(event.key) || event.ctrlKey || event.metaKey) {
    return
  }

  if (!/^\d$/.test(event.key)) {
    event.preventDefault()
  }
}

const handlePaste = (event: ClipboardEvent, fighter: 1 | 2, roundIndex?: number) => {
  event.preventDefault()

  const pastedText = event.clipboardData?.getData('text') ?? ''
  updateScore(fighter, pastedText, roundIndex)
}

const selectInputContent = (event: Event) => {
  ;(event.target as HTMLInputElement).select()
}

const handleBlur = (event: Event, fighter: 1 | 2, roundIndex?: number) => {
  const input = event.target as HTMLInputElement
  const normalizedValue = sanitizeScore(input.value)

  updateScore(fighter, input.value, roundIndex)
  input.value = normalizedValue.toString()

  if (props.fight.roundWin && evaluation.value.requiresTieBreakRound) {
    if (!tieBreakRoundRevealed.value) {
      tieBreakRoundRevealed.value = true
      roundScores.value.push({ competitor1Score: 0, competitor2Score: 0 })
      emitScoreUpdate()
    }
  }
}

const openIssueDialog = (fighter: Fighter) => {
  if (!props.canIssueCards) return

  issueFighter.value = fighter
  issueType.value = 'YELLOW'
  issueDate.value = cardDate.value
  issueReason.value = ''
  issueDialogOpen.value = true
}

const issueCard = async () => {
  if (!issueFighter.value || !props.tournamentId || !issueReason.value.trim()) return

  try {
    isIssuing.value = true
    await cardsStore.createCard({
      fighter_id: issueFighter.value.id,
      tournament_id: props.tournamentId,
      fight_id: props.fight.id,
      type: issueType.value,
      received_at: issueDate.value,
      reason: issueReason.value.trim()
    })
    issueDialogOpen.value = false
    emit('card-issued')
  } catch (error) {
    console.error('Failed to issue disciplinary card:', error)
  } finally {
    isIssuing.value = false
  }
}

watch(
  () => props.fight,
  (newVal) => {
    if (score1.value !== newVal.fighter1Score) score1.value = newVal.fighter1Score
    if (score2.value !== newVal.fighter2Score) score2.value = newVal.fighter2Score
    roundScores.value = newVal.roundScores.map((score) => ({ ...score }))
    tieBreakRoundRevealed.value = Boolean(newVal.tieBreakRoundRevealed)
  },
  { deep: true }
)
</script>

<template>
  <div class="flex items-center gap-4 py-1 px-3 border rounded-lg bg-card">
    <div class="w-auto shrink-0 text-sm text-slate-400 font-semibold">{{ fight.number }}.</div>

    <div class="flex-1 text-sm font-medium">
      <ContextMenu v-if="canIssueCards">
        <ContextMenuTrigger as-child>
          <span class="inline-flex cursor-context-menu items-center gap-1">
            {{ fighter1Surname }}
            <CardStatusIcon :type="fighter1CardType" />
          </span>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem @select="openIssueDialog(fight.fighter1)">
            {{ $t('disciplinaryCardsIssueAction') }}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <span v-else class="inline-flex items-center gap-1">
        {{ fighter1Surname }}
        <CardStatusIcon :type="fighter1CardType" />
      </span>
      <span class="px-2">-</span>
      <ContextMenu v-if="canIssueCards">
        <ContextMenuTrigger as-child>
          <span class="inline-flex cursor-context-menu items-center gap-1">
            {{ fighter2Surname }}
            <CardStatusIcon :type="fighter2CardType" />
          </span>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem @select="openIssueDialog(fight.fighter2)">
            {{ $t('disciplinaryCardsIssueAction') }}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <span v-else class="inline-flex items-center gap-1">
        {{ fighter2Surname }}
        <CardStatusIcon :type="fighter2CardType" />
      </span>
    </div>

    <div class="flex items-center gap-2">
      <template v-if="canEdit && fight.rounds === 1">
        <input
          :value="score1"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          class="w-14 h-8 border rounded text-center focus:ring-2 outline-none"
          :class="
            isTieScore
              ? 'border-red-500 bg-red-50 text-red-700 focus:ring-red-500'
              : 'focus:ring-blue-500'
          "
          @keydown="handleKeydown"
          @focus="selectInputContent"
          @click="selectInputContent"
          @input="updateScore(1, ($event.target as HTMLInputElement).value)"
          @blur="handleBlur($event, 1)"
          @paste="handlePaste($event, 1)"
        />
      </template>
      <span v-if="canEdit && fight.rounds === 1" class="font-bold">:</span>
      <template v-if="canEdit && fight.rounds === 1">
        <input
          :value="score2"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          class="w-14 h-8 border rounded text-center focus:ring-2 outline-none"
          :class="
            isTieScore
              ? 'border-red-500 bg-red-50 text-red-700 focus:ring-red-500'
              : 'focus:ring-blue-500'
          "
          @keydown="handleKeydown"
          @focus="selectInputContent"
          @click="selectInputContent"
          @input="updateScore(2, ($event.target as HTMLInputElement).value)"
          @blur="handleBlur($event, 2)"
          @paste="handlePaste($event, 2)"
        />
      </template>
      <template v-else-if="canEdit">
        <div class="grid gap-1">
          <div
            v-for="(round, roundIndex) in visibleRoundScores"
            :key="roundIndex"
            class="grid grid-cols-[1.75rem_3.5rem_auto_3.5rem] items-center gap-2"
          >
            <span class="text-xs font-semibold text-muted-foreground">R{{ roundIndex + 1 }}</span>
            <input
              :value="round.competitor1Score"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              class="h-8 w-14 rounded border text-center outline-none focus:ring-2 focus:ring-blue-500"
              @keydown="handleKeydown"
              @focus="selectInputContent"
              @click="selectInputContent"
              @input="updateScore(1, ($event.target as HTMLInputElement).value, roundIndex)"
              @blur="handleBlur($event, 1, roundIndex)"
              @paste="handlePaste($event, 1, roundIndex)"
            />
            <span class="font-bold">:</span>
            <input
              :value="round.competitor2Score"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              class="h-8 w-14 rounded border text-center outline-none focus:ring-2 focus:ring-blue-500"
              @keydown="handleKeydown"
              @focus="selectInputContent"
              @click="selectInputContent"
              @input="updateScore(2, ($event.target as HTMLInputElement).value, roundIndex)"
              @blur="handleBlur($event, 2, roundIndex)"
              @paste="handlePaste($event, 2, roundIndex)"
            />
          </div>
        </div>
      </template>
      <div v-else class="text-center">
        <strong>{{ resultDisplay.score }}</strong>
        {{ ' ' }}
        <span v-if="resultDisplay.details" class="fight-result-details font-normal">
          {{ resultDisplay.details }}
        </span>
      </div>
    </div>
  </div>

  <Dialog v-model:open="issueDialogOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ $t('disciplinaryCardsIssueTitle') }}</DialogTitle>
        <DialogDescription>
          {{ $t('disciplinaryCardsIssueDescription') }}
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-3">
        <div class="text-sm font-medium">
          {{ issueFighter ? `${tData(issueFighter.surname)} ${tData(issueFighter.name)}` : '' }}
        </div>
        <div class="grid gap-2">
          <label class="text-sm font-medium" for="card-type">{{
            $t('disciplinaryCardsType')
          }}</label>
          <select id="card-type" v-model="issueType" class="h-9 rounded border bg-background px-2">
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
            :value="issueDate"
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
            v-model="issueReason"
            autocomplete="off"
            class="h-9 rounded border bg-background px-2"
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" @click="issueDialogOpen = false">{{
          $t('disciplinaryCardsCancel')
        }}</Button>
        <Button type="button" :disabled="isIssuing || !issueReason.trim()" @click="issueCard">
          {{ $t('disciplinaryCardsSave') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
