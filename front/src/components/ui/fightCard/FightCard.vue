<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useTranslation } from 'i18next-vue'
import { useDisciplinaryCardsStore } from '@/stores/disciplinaryCards'
import { tData } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import type { DisciplinaryCardStatus, FightData, Fighter, TournamentMarshal } from '@/model'
import FightParticipantLabel from './FightParticipantLabel.vue'
import FightResultDisplay from './FightResultDisplay.vue'
import FightScoreEditor from './FightScoreEditor.vue'
import FightWarningIssueDialog from './FightWarningIssueDialog.vue'
import IssueCardDialog from './IssueCardDialog.vue'
import { useFightWarningPresentation } from './useFightWarningPresentation'
import { useIssueCardDialog } from './useIssueCardDialog'
import type { FighterSide, FightResultDisplayText, FightWarningResultScore } from './types'
import {
  applyFightWarningBonuses,
  evaluateFightScore,
  formatFightResult,
  getFightWarningCount,
  getInitialRoundScores,
  getRequiredRoundScores,
  hasRoundScoreValue,
  type FightScoreEvaluation,
  type FightWarning,
  type RoundScore
} from '@shared/fightScoring'

interface ExtraRoundWarningRemoval {
  targetLength: number
  warningRound: number
}

const props = defineProps<{
  fight: FightData
  hasAccess: boolean
  canIssueCards?: boolean
  tournamentId?: number
  cardDate?: string
  activeCardTypes?: Partial<Record<number, DisciplinaryCardStatus>>
  tournamentMarshals?: TournamentMarshal[]
}>()

const emit = defineEmits<{
  (
    e: 'update:score',
    payload: {
      roundScores?: RoundScore[]
      warnings?: FightWarning[]
    }
  ): void
  (e: 'card-issued'): void
}>()

const rules = computed(() => ({ rounds: props.fight.rounds, roundWin: props.fight.roundWin }))
const roundScores = ref<RoundScore[]>(
  (props.fight.roundScores.length ? props.fight.roundScores : getInitialRoundScores(rules.value)).map(
    (score) => ({ ...score })
  )
)
const warnings = ref<FightWarning[]>(
  (props.fight.warnings ?? []).map((warning) => ({ ...warning }))
)
const { i18next } = useTranslation()
const cardsStore = useDisciplinaryCardsStore()
const warningIssueDialogOpen = ref(false)
const warningIssueFighterSide = ref<FighterSide>(1)
const warningIssueRound = ref(1)
const warningIssueReason = ref('')
const highlightTieBreakRequired = ref(false)
const pendingExtraRoundWarningRemoval = ref<ExtraRoundWarningRemoval | null>(null)
const dismissedExtraRoundWarningRemoval = ref<ExtraRoundWarningRemoval | null>(null)

const fightRef = computed(() => props.fight)
const competitor1Id = computed(() => props.fight.competitor1Id ?? props.fight.fighter1.id)
const competitor2Id = computed(() => props.fight.competitor2Id ?? props.fight.fighter2.id)
const warningContext = computed(() => ({
  competitor1Id: competitor1Id.value,
  competitor2Id: competitor2Id.value,
  warnings: warnings.value
}))
const warningAdjustedScore = computed(() =>
  applyFightWarningBonuses(rules.value, warningContext.value, roundScores.value)
)
const evaluation = computed<FightScoreEvaluation>(() =>
  props.fight.forfeitCardId
    ? evaluateFightScore(rules.value, roundScores.value)
    : {
        ...evaluateFightScore(rules.value, warningAdjustedScore.value.roundScores),
        ...(warningAdjustedScore.value.technicalLoserSide
          ? {
              winnerSide: (warningAdjustedScore.value.technicalLoserSide === 1 ? 2 : 1) as 1 | 2,
              isValidResult: true,
              error: null
            }
          : {})
      }
)
const hasWarningTechnicalLoss = computed(
  () => !props.fight.forfeitCardId && Boolean(warningAdjustedScore.value.technicalLoserSide)
)
const canEdit = computed(() => props.hasAccess && !props.fight.isFinished)
const canEditScores = computed(() => canEdit.value && !hasWarningTechnicalLoss.value)
const canOpenFighterMenu = computed(() => Boolean(props.canIssueCards) && !props.fight.isFinished)
const canRemoveWarnings = computed(() => canOpenFighterMenu.value && canEdit.value)
const resultText = computed(() =>
  formatFightResult(
    rules.value,
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
const hasWarnings = computed(() => warnings.value.length > 0)
const warningResultScore = computed<FightWarningResultScore | null>(() => {
  if (!hasWarnings.value || props.fight.forfeitCardId) return null

  const leading = props.fight.roundWin
    ? `${evaluation.value.competitor1RoundWins}:${evaluation.value.competitor2RoundWins}`
    : `${warningAdjustedScore.value.aggregateScore.competitor1Score}:${warningAdjustedScore.value.aggregateScore.competitor2Score}`

  return {
    leading,
    parts: warningAdjustedScore.value.scoreParts
  }
})
const resultDisplay = computed<FightResultDisplayText>(() => {
  const detailsStart = resultText.value.indexOf(' (')

  return detailsStart === -1
    ? { score: resultText.value, details: '' }
    : {
        score: resultText.value.slice(0, detailsStart),
        details: resultText.value.slice(detailsStart + 1)
      }
})
const visibleRoundScores = computed(() => roundScores.value)

const currentLanguage = computed(() => i18next.language)
const fighter1Surname = computed(() => tData(props.fight.fighter1.surname, currentLanguage.value))
const fighter2Surname = computed(() => tData(props.fight.fighter2.surname, currentLanguage.value))
const fighter1CardType = computed(() => props.activeCardTypes?.[props.fight.fighter1.id])
const fighter2CardType = computed(() => props.activeCardTypes?.[props.fight.fighter2.id])
const cardDate = computed(() => props.cardDate ?? new Date().toISOString().slice(0, 10))
const {
  issueDialogOpen,
  issueFighter,
  issueType,
  issueDate,
  issueReason,
  issueMarshalId,
  isIssuing,
  openIssueDialog: openIssueCardDialog,
  issueCard
} = useIssueCardDialog({
  cardsStore,
  getFight: () => props.fight,
  getTournamentId: () => props.tournamentId,
  cardDate,
  emitCardIssued: () => emit('card-issued')
})

const sanitizeScore = (value: string) => {
  const digitsOnly = value.replace(/\D/g, '')

  return digitsOnly === '' ? 0 : Number.parseInt(digitsOnly, 10)
}

const emitScoreUpdate = () => {
  emit('update:score', {
    roundScores: roundScores.value.map((score) => ({ ...score })),
    warnings: warnings.value.map((warning) => ({ ...warning }))
  })
}

const effectiveRoundScoresFor = (scores: RoundScore[]) =>
  props.fight.forfeitCardId
    ? scores.map((score) => ({ ...score }))
    : applyFightWarningBonuses(rules.value, warningContext.value, scores).roundScores

const hasPendingExtraRound = () => {
  const roundNumber = roundScores.value.length
  const lastRound = roundScores.value[roundNumber - 1]

  return (
    roundNumber > rules.value.rounds &&
    lastRound !== undefined &&
    !hasRoundScoreValue(lastRound) &&
    !warnings.value.some((warning) => warning.round === roundNumber)
  )
}

const isElement = (target: EventTarget | null): target is HTMLElement => target instanceof HTMLElement

const shouldAppendExtraRoundOnBlur = (isLastInput: boolean) => isLastInput

const isScoreInputOutsideCurrentFight = (event: FocusEvent) => {
  const nextFocusedElement = event.relatedTarget
  if (
    !isElement(nextFocusedElement) ||
    nextFocusedElement.dataset.fightScoreInput !== 'true'
  ) {
    return false
  }

  const currentFightElement = isElement(event.target)
    ? event.target.closest<HTMLElement>('[data-fight-card-id]')
    : null

  return !currentFightElement?.contains(nextFocusedElement)
}

const isEnterNavigationBlur = (event: FocusEvent) =>
  isElement(event.target) && event.target.dataset.fightScoreEnterNavigation === 'true'

const isTabNavigationBlur = (event: FocusEvent) =>
  isElement(event.target) && event.target.dataset.fightScoreTabNavigation === 'true'

const clearEnterNavigationMarker = (event: FocusEvent) => {
  if (isElement(event.target)) {
    delete event.target.dataset.fightScoreEnterNavigation
  }
}

const clearTabNavigationMarker = (event: FocusEvent) => {
  if (isElement(event.target)) {
    delete event.target.dataset.fightScoreTabNavigation
  }
}

const isExternalTieHighlightSuppressed = (event: FocusEvent) =>
  isElement(event.target) &&
  event.target.dataset.fightScoreSuppressExternalTieHighlight === 'true'

const clearExternalTieHighlightSuppression = (event: FocusEvent) => {
  if (isElement(event.target)) {
    delete event.target.dataset.fightScoreSuppressExternalTieHighlight
  }
}

const suppressExternalTieHighlightForActiveScoreInput = (currentFightElement: HTMLElement | null) => {
  const activeElement = document.activeElement
  if (
    isElement(activeElement) &&
    activeElement.dataset.fightScoreInput === 'true' &&
    !currentFightElement?.contains(activeElement)
  ) {
    activeElement.dataset.fightScoreSuppressExternalTieHighlight = 'true'
  }
}

const focusFirstInputInRound = (roundIndex: number) => {
  const currentFightElement = document.querySelector<HTMLElement>(
    `[data-fight-card-id="${props.fight.id}"]`
  )
  const input = currentFightElement?.querySelector<HTMLInputElement>(
    `[data-fight-score-input="true"][data-round-index="${roundIndex}"][data-fighter-side="1"]`
  )

  if (input) {
    suppressExternalTieHighlightForActiveScoreInput(currentFightElement)
    input.focus()
  }
}

const findFirstWarningRoundAfter = (roundNumber: number) =>
  warnings.value.reduce<number | null>((firstWarningRound, warning) => {
    if (warning.round <= roundNumber) return firstWarningRound

    return firstWarningRound === null || warning.round < firstWarningRound
      ? warning.round
      : firstWarningRound
  }, null)

const trimRoundScoresAndWarnings = (roundCount: number) => {
  const nextRoundScores = roundScores.value
    .slice(0, roundCount)
    .map((score) => ({ ...score }))
  const nextWarnings = warnings.value
    .filter((warning) => warning.round <= roundCount)
    .map((warning) => ({ ...warning }))
  const didChange =
    nextRoundScores.length !== roundScores.value.length ||
    nextWarnings.length !== warnings.value.length

  roundScores.value = nextRoundScores
  warnings.value = nextWarnings

  return didChange
}

const isSameExtraRoundWarningRemoval = (
  firstRemoval: ExtraRoundWarningRemoval | null,
  secondRemoval: ExtraRoundWarningRemoval
) =>
  firstRemoval?.targetLength === secondRemoval.targetLength &&
  firstRemoval.warningRound === secondRemoval.warningRound

const trimStaleRoundsWithWarningGuard = (requiredRoundCount: number) => {
  if (requiredRoundCount >= roundScores.value.length) return false

  const firstWarningRound = findFirstWarningRoundAfter(requiredRoundCount)
  if (firstWarningRound === null) {
    pendingExtraRoundWarningRemoval.value = null
    return trimRoundScoresAndWarnings(requiredRoundCount)
  }

  const nextRemoval = {
    targetLength: requiredRoundCount,
    warningRound: firstWarningRound
  }
  if (!isSameExtraRoundWarningRemoval(dismissedExtraRoundWarningRemoval.value, nextRemoval)) {
    pendingExtraRoundWarningRemoval.value = nextRemoval
  }

  return trimRoundScoresAndWarnings(firstWarningRound)
}

const syncRoundScoresWithEffectiveEvaluation = (
  appendIfRequired: boolean,
  allowPendingExtraRoundAppend: boolean
) => {
  const requiredEffectiveRounds = getRequiredRoundScores(
    rules.value,
    effectiveRoundScoresFor(roundScores.value)
  )
  let didChange = trimStaleRoundsWithWarningGuard(requiredEffectiveRounds.length)
  let appendedRoundIndex: number | null = null

  const currentEvaluation = evaluateFightScore(
    rules.value,
    effectiveRoundScoresFor(roundScores.value)
  )
  if (
    appendIfRequired &&
    currentEvaluation.requiresTieBreakRound &&
    (allowPendingExtraRoundAppend || !hasPendingExtraRound())
  ) {
    roundScores.value.push({ competitor1Score: 0, competitor2Score: 0 })
    appendedRoundIndex = roundScores.value.length - 1
    didChange = true
  }

  return {
    didChange,
    appendedRoundIndex,
    requiresTieBreakRound: currentEvaluation.requiresTieBreakRound
  }
}

const updateScore = (fighter: FighterSide, value: string, roundIndex?: number) => {
  const normalizedValue = sanitizeScore(value)
  if (roundIndex === undefined || !roundScores.value[roundIndex]) return
  const currentValue =
    fighter === 1
      ? roundScores.value[roundIndex].competitor1Score
      : roundScores.value[roundIndex].competitor2Score

  if (fighter === 1) {
    roundScores.value[roundIndex].competitor1Score = normalizedValue
  } else {
    roundScores.value[roundIndex].competitor2Score = normalizedValue
  }

  if (currentValue !== normalizedValue) {
    dismissedExtraRoundWarningRemoval.value = null
    highlightTieBreakRequired.value = false
    emitScoreUpdate()
  }
}

const handleBlur = (
  event: FocusEvent,
  fighter: FighterSide,
  roundIndex: number,
  isLastInput: boolean
) => {
  const input = event.target as HTMLInputElement
  const normalizedValue = sanitizeScore(input.value)

  updateScore(fighter, input.value, roundIndex)
  input.value = normalizedValue.toString()

  const shouldMoveFocusToAppendedRound = isEnterNavigationBlur(event) || isTabNavigationBlur(event)
  const shouldHighlightExternalTie =
    !isLastInput && isScoreInputOutsideCurrentFight(event) && !isExternalTieHighlightSuppressed(event)
  const syncResult = syncRoundScoresWithEffectiveEvaluation(
    shouldAppendExtraRoundOnBlur(isLastInput),
    true
  )
  clearEnterNavigationMarker(event)
  clearTabNavigationMarker(event)
  clearExternalTieHighlightSuppression(event)

  if (syncResult.appendedRoundIndex !== null || !syncResult.requiresTieBreakRound) {
    highlightTieBreakRequired.value = false
  } else if (shouldHighlightExternalTie) {
    highlightTieBreakRequired.value = true
  }

  if (syncResult.didChange) {
    emitScoreUpdate()
  }
  if (syncResult.appendedRoundIndex !== null && shouldMoveFocusToAppendedRound) {
    void nextTick(() => focusFirstInputInRound(syncResult.appendedRoundIndex as number))
  }
}

const extraRoundWarningRemovalDialogOpen = computed({
  get: () => pendingExtraRoundWarningRemoval.value !== null,
  set: (open: boolean) => {
    if (!open) {
      pendingExtraRoundWarningRemoval.value = null
    }
  }
})

const extraRoundWarningRemovalDescription = computed(() =>
  i18next.t('fightExtraRoundWarningRemovalDescription', {
    round: pendingExtraRoundWarningRemoval.value?.warningRound ?? 0
  })
)

const confirmExtraRoundWarningRemoval = () => {
  const pendingRemoval = pendingExtraRoundWarningRemoval.value
  if (pendingRemoval === null) return

  trimRoundScoresAndWarnings(pendingRemoval.targetLength)
  pendingExtraRoundWarningRemoval.value = null
  dismissedExtraRoundWarningRemoval.value = null
  highlightTieBreakRequired.value = false
  emitScoreUpdate()
}

const cancelExtraRoundWarningRemoval = () => {
  dismissedExtraRoundWarningRemoval.value = pendingExtraRoundWarningRemoval.value
  pendingExtraRoundWarningRemoval.value = null
}

const {
  warningTitle,
  availableWarningIssueRounds,
  warningCompetitorId,
  warningMarkers,
  bonusForScore
} = useFightWarningPresentation({
  fight: fightRef,
  warnings,
  visibleRoundScores,
  competitor1Id,
  competitor2Id,
  translate: i18next.t.bind(i18next)
})

const canIssueWarning = (fighter: FighterSide) =>
  canEdit.value &&
  !hasWarningTechnicalLoss.value &&
  getFightWarningCount(warnings.value, warningCompetitorId(fighter)) < 3

const issueWarningInRound = (fighter: FighterSide, round: number, reason: string) => {
  if (!canEdit.value) return
  const competitorId = warningCompetitorId(fighter)
  if (!canIssueWarning(fighter)) return
  if (!availableWarningIssueRounds.value.includes(round)) return
  const trimmedReason = reason.trim()
  if (!trimmedReason) return

  warnings.value = [...warnings.value, { competitorId, round, reason: trimmedReason }]
  dismissedExtraRoundWarningRemoval.value = null
  syncRoundScoresWithEffectiveEvaluation(true, false)
  highlightTieBreakRequired.value = false
  emitScoreUpdate()
}

const removeWarningAtIndex = (warningIndex: number) => {
  if (!canEdit.value) return
  if (warningIndex < 0 || warningIndex >= warnings.value.length) return

  warnings.value = warnings.value.filter((_, index) => index !== warningIndex)
  dismissedExtraRoundWarningRemoval.value = null
  syncRoundScoresWithEffectiveEvaluation(true, false)
  highlightTieBreakRequired.value = false
  emitScoreUpdate()
}

const issueWarning = (fighter: FighterSide) => {
  if (!canIssueWarning(fighter)) return
  warningIssueFighterSide.value = fighter
  warningIssueRound.value = availableWarningIssueRounds.value[0] ?? 1
  warningIssueReason.value = ''
  warningIssueDialogOpen.value = true
}

const confirmWarningIssue = () => {
  if (!warningIssueReason.value.trim()) return
  if (!availableWarningIssueRounds.value.includes(warningIssueRound.value)) return

  issueWarningInRound(
    warningIssueFighterSide.value,
    warningIssueRound.value,
    warningIssueReason.value
  )
  warningIssueDialogOpen.value = false
}

const openIssueDialog = (fighter: Fighter) => {
  if (!props.canIssueCards) return

  openIssueCardDialog(fighter)
}

watch(
  () => props.fight,
  (newVal) => {
    roundScores.value = (
      newVal.roundScores.length
        ? newVal.roundScores
        : getInitialRoundScores({ rounds: newVal.rounds, roundWin: newVal.roundWin })
    ).map((score) => ({ ...score }))
    warnings.value = (newVal.warnings ?? []).map((warning) => ({ ...warning }))
    highlightTieBreakRequired.value = false
    pendingExtraRoundWarningRemoval.value = null
    dismissedExtraRoundWarningRemoval.value = null
  },
  { deep: true }
)
</script>

<template>
  <div class="flex items-center gap-4 py-1 px-3 border rounded-lg bg-card" :data-fight-card-id="fight.id">
    <div class="w-auto shrink-0 text-sm text-slate-400 font-semibold">{{ fight.number }}.</div>

    <div class="flex-1 text-sm font-medium">
      <FightParticipantLabel
        :surname="fighter1Surname"
        :fighter="fight.fighter1"
        :card-type="fighter1CardType"
        :warning-markers="warningMarkers(1)"
        :warning-title="warningTitle"
        :can-open-menu="canOpenFighterMenu"
        :can-issue-warning="canIssueWarning(1)"
        :can-remove-warnings="canRemoveWarnings"
        @issue-card="openIssueDialog"
        @issue-warning="issueWarning(1)"
        @remove-warning="removeWarningAtIndex"
      />
      <span class="px-2">-</span>
      <FightParticipantLabel
        :surname="fighter2Surname"
        :fighter="fight.fighter2"
        :card-type="fighter2CardType"
        :warning-markers="warningMarkers(2)"
        :warning-title="warningTitle"
        :can-open-menu="canOpenFighterMenu"
        :can-issue-warning="canIssueWarning(2)"
        :can-remove-warnings="canRemoveWarnings"
        @issue-card="openIssueDialog"
        @issue-warning="issueWarning(2)"
        @remove-warning="removeWarningAtIndex"
      />
    </div>

    <div class="flex items-center gap-2">
      <FightScoreEditor
        v-if="canEdit"
        :visible-round-scores="visibleRoundScores"
        :can-edit-scores="canEditScores"
        :highlight-tie-break-required="highlightTieBreakRequired"
        :bonus-for-score="bonusForScore"
        @update-score="updateScore"
        @score-blur="handleBlur"
      />
      <FightResultDisplay
        v-else
        :warning-result-score="warningResultScore"
        :result-display="resultDisplay"
      />
    </div>
  </div>

  <FightWarningIssueDialog
    v-model:open="warningIssueDialogOpen"
    v-model:selected-round="warningIssueRound"
    v-model:reason="warningIssueReason"
    :issue-rounds="availableWarningIssueRounds"
    @confirm="confirmWarningIssue"
  />

  <IssueCardDialog
    v-model:open="issueDialogOpen"
    v-model:type="issueType"
    v-model:reason="issueReason"
    v-model:marshalId="issueMarshalId"
    :fighter="issueFighter"
    :date="issueDate"
    :tournament-marshals="tournamentMarshals ?? []"
    :is-issuing="isIssuing"
    @issue="issueCard"
  />

  <Dialog v-model:open="extraRoundWarningRemovalDialogOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ $t('fightExtraRoundWarningRemovalTitle') }}</DialogTitle>
        <DialogDescription>
          {{ extraRoundWarningRemovalDescription }}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          data-testid="extra-round-warning-removal-cancel"
          @click="cancelExtraRoundWarningRemoval"
        >
          {{ $t('disciplinaryCardsCancel') }}
        </Button>
        <Button
          type="button"
          variant="destructive"
          data-testid="extra-round-warning-removal-confirm"
          @click="confirmExtraRoundWarningRemoval"
        >
          {{ $t('fightExtraRoundWarningRemovalConfirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
