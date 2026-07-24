<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTranslation } from 'i18next-vue'
import { useDisciplinaryCardsStore } from '@/stores/disciplinaryCards'
import { tData } from '@/lib/utils'
import type { DisciplinaryCardType, FightData, Fighter } from '@/model'
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
  type FightScoreEvaluation,
  type FightWarning,
  type RoundScore
} from '@shared/fightScoring'

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
      warnings?: FightWarning[]
    }
  ): void
  (e: 'card-issued'): void
}>()

const score1 = ref(props.fight.fighter1Score)
const score2 = ref(props.fight.fighter2Score)
const roundScores = ref<RoundScore[]>(props.fight.roundScores.map((score) => ({ ...score })))
const warnings = ref<FightWarning[]>(
  (props.fight.warnings ?? []).map((warning) => ({ ...warning }))
)
const tieBreakRoundRevealed = ref(Boolean(props.fight.tieBreakRoundRevealed))
const { i18next } = useTranslation()
const cardsStore = useDisciplinaryCardsStore()
const warningIssueDialogOpen = ref(false)
const warningIssueFighterSide = ref<FighterSide>(1)
const warningIssueRound = ref(1)
const warningIssueReason = ref('')

const fightRef = computed(() => props.fight)
const competitor1Id = computed(() => props.fight.competitor1Id ?? props.fight.fighter1.id)
const competitor2Id = computed(() => props.fight.competitor2Id ?? props.fight.fighter2.id)
const warningContext = computed(() => ({
  competitor1Id: competitor1Id.value,
  competitor2Id: competitor2Id.value,
  warnings: warnings.value
}))
const warningAdjustedScore = computed(() =>
  applyFightWarningBonuses(
    { rounds: props.fight.rounds, roundWin: props.fight.roundWin },
    warningContext.value,
    props.fight.rounds === 1 ? [] : roundScores.value,
    props.fight.rounds === 1
      ? { competitor1Score: score1.value, competitor2Score: score2.value }
      : undefined
  )
)
const evaluation = computed<FightScoreEvaluation>(() =>
  props.fight.forfeitCardId
    ? evaluateFightScore(
        { rounds: props.fight.rounds, roundWin: props.fight.roundWin },
        props.fight.rounds === 1 ? [] : roundScores.value,
        props.fight.rounds === 1
          ? { competitor1Score: score1.value, competitor2Score: score2.value }
          : undefined
      )
    : {
        ...evaluateFightScore(
          { rounds: props.fight.rounds, roundWin: props.fight.roundWin },
          props.fight.rounds === 1 ? [] : warningAdjustedScore.value.roundScores,
          props.fight.rounds === 1 ? warningAdjustedScore.value.aggregateScore : undefined
        ),
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
const isTieScore = computed(
  () =>
    canEditScores.value &&
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
const hasWarnings = computed(() => warnings.value.length > 0)
const warningResultScore = computed<FightWarningResultScore | null>(() => {
  if (!hasWarnings.value || props.fight.forfeitCardId) return null
  if (props.fight.rounds === 1) {
    return {
      leading: '',
      parts: warningAdjustedScore.value.scoreParts
    }
  }

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
const {
  issueDialogOpen,
  issueFighter,
  issueType,
  issueDate,
  issueReason,
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
  if (props.fight.rounds === 1) {
    emit('update:score', {
      f1: score1.value,
      f2: score2.value,
      warnings: warnings.value.map((warning) => ({ ...warning }))
    })
    return
  }

  emit('update:score', {
    roundScores: roundScores.value.map((score) => ({ ...score })),
    tieBreakRoundRevealed: tieBreakRoundRevealed.value,
    warnings: warnings.value.map((warning) => ({ ...warning }))
  })
}

const updateScore = (fighter: FighterSide, value: string, roundIndex?: number) => {
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
    !evaluateFightScore({ rounds: 3, roundWin: true }, roundScores.value.slice(0, 3))
      .requiresTieBreakRound
  ) {
    tieBreakRoundRevealed.value = false
    roundScores.value = roundScores.value.slice(0, 3)
  }

  if (currentValue !== normalizedValue) {
    emitScoreUpdate()
  }
}

const handleBlur = (event: Event, fighter: FighterSide, roundIndex?: number) => {
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
  emitScoreUpdate()
}

const removeWarningAtIndex = (warningIndex: number) => {
  if (!canEdit.value) return
  if (warningIndex < 0 || warningIndex >= warnings.value.length) return

  warnings.value = warnings.value.filter((_, index) => index !== warningIndex)
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
    if (score1.value !== newVal.fighter1Score) score1.value = newVal.fighter1Score
    if (score2.value !== newVal.fighter2Score) score2.value = newVal.fighter2Score
    roundScores.value = newVal.roundScores.map((score) => ({ ...score }))
    warnings.value = (newVal.warnings ?? []).map((warning) => ({ ...warning }))
    tieBreakRoundRevealed.value = Boolean(newVal.tieBreakRoundRevealed)
  },
  { deep: true }
)
</script>

<template>
  <div class="flex items-center gap-4 py-1 px-3 border rounded-lg bg-card">
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
        :rounds="fight.rounds"
        :score1="score1"
        :score2="score2"
        :visible-round-scores="visibleRoundScores"
        :can-edit-scores="canEditScores"
        :is-tie-score="isTieScore"
        :bonus-for-score="bonusForScore"
        @update-score="updateScore"
        @score-blur="handleBlur"
      />
      <FightResultDisplay
        v-else
        :rounds="fight.rounds"
        :warning-result-score="warningResultScore"
        :result-display="resultDisplay"
      />
    </div>
  </div>

  <FightWarningIssueDialog
    v-model:open="warningIssueDialogOpen"
    v-model:selected-round="warningIssueRound"
    v-model:reason="warningIssueReason"
    :rounds="fight.rounds"
    :issue-rounds="availableWarningIssueRounds"
    @confirm="confirmWarningIssue"
  />

  <IssueCardDialog
    v-model:open="issueDialogOpen"
    v-model:type="issueType"
    v-model:reason="issueReason"
    :fighter="issueFighter"
    :date="issueDate"
    :is-issuing="isIssuing"
    @issue="issueCard"
  />
</template>
