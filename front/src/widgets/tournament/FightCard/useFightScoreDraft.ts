import { computed, nextTick, ref, watch, type ComputedRef } from 'vue'
import type { FightData } from '@/model'
import type {
  FightScoreEvaluation,
  FightWarning,
  RoundScore
} from '@shared/fightScoring'
import {
  applyFightWarningBonuses,
  evaluateFightScore,
  formatFightResult,
  getFightWarningCount,
  getInitialRoundScores,
  getRequiredRoundScores,
  hasRoundScoreValue
} from '@shared/fightScoring'
import {
  clearEnterNavigationMarker,
  clearExternalTieHighlightSuppression,
  clearTabNavigationMarker,
  focusFirstInputInFightRound,
  isEnterNavigationBlur,
  isExternalTieHighlightSuppressed,
  isScoreInputOutsideCurrentFight,
  isTabNavigationBlur
} from './fightScoreFocusNavigation'
import { useFightWarningPresentation } from './useFightWarningPresentation'
import type { FighterSide, FightResultDisplayText, FightWarningResultScore } from './types'

interface ExtraRoundWarningRemoval {
  targetLength: number
  warningRound: number
}

interface FightScoreUpdatePayload {
  roundScores?: RoundScore[]
  warnings?: FightWarning[]
}

type Translate = (key: string, options?: Record<string, string | number>) => string

interface UseFightScoreDraftParams {
  fight: ComputedRef<FightData>
  hasAccess: ComputedRef<boolean>
  canIssueCards: ComputedRef<boolean | undefined>
  translate: Translate
  emitScoreUpdate: (payload: FightScoreUpdatePayload) => void
}

const cloneRoundScores = (scores: RoundScore[]) => scores.map((score) => ({ ...score }))

const cloneWarnings = (warnings: FightWarning[]) => warnings.map((warning) => ({ ...warning }))

const roundDurationFor = (fight: FightData, roundNumber: number) =>
  roundNumber <= fight.rounds ? (fight.mainRoundTime ?? 0) : (fight.additionalRoundTime ?? 0)

const initialRoundScoresFor = (fight: FightData) =>
  cloneRoundScores(
    fight.roundScores.length
      ? fight.roundScores
      : getInitialRoundScores({ rounds: fight.rounds, roundWin: fight.roundWin })
  )

export const useFightScoreDraft = ({
  fight,
  hasAccess,
  canIssueCards,
  translate,
  emitScoreUpdate
}: UseFightScoreDraftParams) => {
  const rules = computed(() => ({ rounds: fight.value.rounds, roundWin: fight.value.roundWin }))
  const roundScores = ref<RoundScore[]>(initialRoundScoresFor(fight.value))
  const warnings = ref<FightWarning[]>(cloneWarnings(fight.value.warnings ?? []))
  const warningIssueDialogOpen = ref(false)
  const warningIssueFighterSide = ref<FighterSide>(1)
  const warningIssueRound = ref(1)
  const warningIssueReason = ref('')
  const highlightTieBreakRequired = ref(false)
  const pendingExtraRoundWarningRemoval = ref<ExtraRoundWarningRemoval | null>(null)
  const dismissedExtraRoundWarningRemoval = ref<ExtraRoundWarningRemoval | null>(null)

  const competitor1Id = computed(() => fight.value.competitor1Id ?? fight.value.fighter1.id)
  const competitor2Id = computed(() => fight.value.competitor2Id ?? fight.value.fighter2.id)
  const warningContext = computed(() => ({
    competitor1Id: competitor1Id.value,
    competitor2Id: competitor2Id.value,
    warnings: warnings.value
  }))
  const warningAdjustedScore = computed(() =>
    applyFightWarningBonuses(rules.value, warningContext.value, roundScores.value)
  )
  const evaluation = computed<FightScoreEvaluation>(() =>
    fight.value.isTechnicalForfeit
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
    () => !fight.value.isTechnicalForfeit && Boolean(warningAdjustedScore.value.technicalLoserSide)
  )
  const canEdit = computed(() => hasAccess.value && !fight.value.isFinished)
  const canEditScores = computed(() => canEdit.value && !hasWarningTechnicalLoss.value)
  const canOpenFighterMenu = computed(() => Boolean(canIssueCards.value) && !fight.value.isFinished)
  const canRemoveWarnings = computed(() => canOpenFighterMenu.value && canEdit.value)
  const resultText = computed(() =>
    formatFightResult(
      rules.value,
      fight.value.isTechnicalForfeit
        ? {
            ...evaluation.value,
            competitor1Total: fight.value.fighter1Score,
            competitor2Total: fight.value.fighter2Score
          }
        : evaluation.value,
      roundScores.value,
      Boolean(fight.value.isTechnicalForfeit)
    )
  )
  const hasWarnings = computed(() => warnings.value.length > 0)
  const warningResultScore = computed<FightWarningResultScore | null>(() => {
    if (!hasWarnings.value || fight.value.isTechnicalForfeit) return null

    const leading = fight.value.roundWin
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
    roundScores.value.map((score, index) => ({
      ...score,
      durationSeconds: score.durationSeconds ?? roundDurationFor(fight.value, index + 1)
    }))
  )

  const emitDraftUpdate = () => {
    emitScoreUpdate({
      roundScores: cloneRoundScores(roundScores.value),
      warnings: cloneWarnings(warnings.value)
    })
  }

  const effectiveRoundScoresFor = (scores: RoundScore[]) =>
    fight.value.isTechnicalForfeit
      ? cloneRoundScores(scores)
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

  const findFirstWarningRoundAfter = (roundNumber: number) =>
    warnings.value.reduce<number | null>((firstWarningRound, warning) => {
      if (warning.round <= roundNumber) return firstWarningRound

      return firstWarningRound === null || warning.round < firstWarningRound
        ? warning.round
        : firstWarningRound
    }, null)

  const trimRoundScoresAndWarnings = (roundCount: number) => {
    const nextRoundScores = cloneRoundScores(roundScores.value.slice(0, roundCount))
    const nextWarnings = cloneWarnings(
      warnings.value.filter((warning) => warning.round <= roundCount)
    )
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
      roundScores.value.push({
        competitor1Score: 0,
        competitor2Score: 0
      })
      appendedRoundIndex = roundScores.value.length - 1
      didChange = true
    }

    return {
      didChange,
      appendedRoundIndex,
      requiresTieBreakRound: currentEvaluation.requiresTieBreakRound
    }
  }

  const sanitizeScore = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '')

    return digitsOnly === '' ? 0 : Number.parseInt(digitsOnly, 10)
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
      emitDraftUpdate()
    }
  }

  const updateRoundTime = (roundIndex: number, durationSeconds: number) => {
    if (!roundScores.value[roundIndex]) return
    const currentValue =
      roundScores.value[roundIndex].durationSeconds ??
      roundDurationFor(fight.value, roundIndex + 1)

    roundScores.value[roundIndex].durationSeconds = durationSeconds

    if (currentValue !== durationSeconds) {
      emitDraftUpdate()
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
    const syncResult = syncRoundScoresWithEffectiveEvaluation(isLastInput, true)
    clearEnterNavigationMarker(event)
    clearTabNavigationMarker(event)
    clearExternalTieHighlightSuppression(event)

    if (syncResult.appendedRoundIndex !== null || !syncResult.requiresTieBreakRound) {
      highlightTieBreakRequired.value = false
    } else if (shouldHighlightExternalTie) {
      highlightTieBreakRequired.value = true
    }

    if (syncResult.didChange) {
      emitDraftUpdate()
    }
    if (syncResult.appendedRoundIndex !== null && shouldMoveFocusToAppendedRound) {
      void nextTick(() =>
        focusFirstInputInFightRound(fight.value.id, syncResult.appendedRoundIndex as number)
      )
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
    translate('fightExtraRoundWarningRemovalDescription', {
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
    emitDraftUpdate()
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
    fight,
    warnings,
    visibleRoundScores,
    competitor1Id,
    competitor2Id,
    translate
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
    emitDraftUpdate()
  }

  const removeWarningAtIndex = (warningIndex: number) => {
    if (!canEdit.value) return
    if (warningIndex < 0 || warningIndex >= warnings.value.length) return

    warnings.value = warnings.value.filter((_, index) => index !== warningIndex)
    dismissedExtraRoundWarningRemoval.value = null
    syncRoundScoresWithEffectiveEvaluation(true, false)
    highlightTieBreakRequired.value = false
    emitDraftUpdate()
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

  watch(
    () => fight.value,
    (newVal) => {
      roundScores.value = initialRoundScoresFor(newVal)
      warnings.value = cloneWarnings(newVal.warnings ?? [])
      highlightTieBreakRequired.value = false
      pendingExtraRoundWarningRemoval.value = null
      dismissedExtraRoundWarningRemoval.value = null
    },
    { deep: true }
  )

  return {
    canEdit,
    canEditScores,
    canOpenFighterMenu,
    canRemoveWarnings,
    resultDisplay,
    warningResultScore,
    visibleRoundScores,
    highlightTieBreakRequired,
    warningIssueDialogOpen,
    warningIssueRound,
    warningIssueReason,
    extraRoundWarningRemovalDialogOpen,
    extraRoundWarningRemovalDescription,
    warningTitle,
    availableWarningIssueRounds,
    warningMarkers,
    bonusForScore,
    updateScore,
    updateRoundTime,
    handleBlur,
    canIssueWarning,
    issueWarning,
    confirmWarningIssue,
    removeWarningAtIndex,
    confirmExtraRoundWarningRemoval,
    cancelExtraRoundWarningRemoval
  }
}
