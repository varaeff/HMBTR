import { computed, type ComputedRef, type Ref } from 'vue'
import type { FightData } from '@/model'
import type { FightWarning, RoundScore } from '@shared/fightScoring'
import type { FighterSide, FightWarningMarker } from './types'

type Translate = (key: string, options?: Record<string, string | number>) => string

interface FightWarningCompetitorIds {
  competitor1Id: number
  competitor2Id: number
}

interface CreateFightWarningMarkersParams extends FightWarningCompetitorIds {
  fighter: FighterSide
  rounds: FightData['rounds']
  warnings: FightWarning[]
  translate: Translate
}

interface UseFightWarningPresentationParams {
  fight: ComputedRef<FightData>
  warnings: Ref<FightWarning[]>
  visibleRoundScores: ComputedRef<RoundScore[]>
  competitor1Id: ComputedRef<number>
  competitor2Id: ComputedRef<number>
  translate: Translate
}

export const warningCompetitorId = (
  fighter: FighterSide,
  { competitor1Id, competitor2Id }: FightWarningCompetitorIds
) => (fighter === 1 ? competitor1Id : competitor2Id)

export const warningMarkerTitle = (
  warning: FightWarning,
  rounds: FightData['rounds'],
  translate: Translate
) =>
  rounds === 1 && warning.round === 1
    ? translate('fightWarningReasonTooltip', { reason: warning.reason })
    : translate('fightWarningRoundReasonTooltip', {
        round: warning.round,
        reason: warning.reason
      })

export const createFightWarningMarkers = ({
  fighter,
  rounds,
  warnings,
  translate,
  competitor1Id,
  competitor2Id
}: CreateFightWarningMarkersParams): FightWarningMarker[] => {
  const competitorId = warningCompetitorId(fighter, { competitor1Id, competitor2Id })
  const fighterWarnings = warnings
    .map((warning, index) => ({ warning, index }))
    .filter(({ warning }) => warning.competitorId === competitorId)

  if (rounds === 1) {
    return fighterWarnings.map(({ warning, index }) => ({
      id: `${fighter}-${index}`,
      warningIndex: index,
      round: warning.round > 1 ? warning.round : undefined,
      title: warningMarkerTitle(warning, rounds, translate)
    }))
  }

  return fighterWarnings.map(({ warning, index }) => ({
    id: `${fighter}-${warning.round}-${index}`,
    warningIndex: index,
    round: warning.round,
    title: warningMarkerTitle(warning, rounds, translate)
  }))
}

export const availableIssueWarningRounds = (
  _rounds: FightData['rounds'],
  visibleRoundScores: RoundScore[]
) => visibleRoundScores.map((_, index) => index + 1)

export const bonusForScore = (
  fighter: FighterSide,
  round: number,
  warnings: FightWarning[],
  { competitor1Id, competitor2Id }: FightWarningCompetitorIds
) => {
  const penalizedCompetitorId = fighter === 1 ? competitor2Id : competitor1Id
  return (
    warnings.filter(
      (warning) => warning.competitorId === penalizedCompetitorId && warning.round === round
    ).length * 3
  )
}

export const useFightWarningPresentation = ({
  fight,
  warnings,
  visibleRoundScores,
  competitor1Id,
  competitor2Id,
  translate
}: UseFightWarningPresentationParams) => {
  const warningTitle = computed(() => translate('fightWarningTooltip'))
  const availableWarningIssueRounds = computed(() =>
    availableIssueWarningRounds(fight.value.rounds, visibleRoundScores.value)
  )

  const warningMarkers = (fighter: FighterSide) =>
    createFightWarningMarkers({
      fighter,
      rounds: fight.value.rounds,
      warnings: warnings.value,
      translate,
      competitor1Id: competitor1Id.value,
      competitor2Id: competitor2Id.value
    })

  const scoreBonus = (fighter: FighterSide, round = 1) =>
    bonusForScore(fighter, round, warnings.value, {
      competitor1Id: competitor1Id.value,
      competitor2Id: competitor2Id.value
    })

  return {
    warningTitle,
    availableWarningIssueRounds,
    warningCompetitorId: (fighter: FighterSide) =>
      warningCompetitorId(fighter, {
        competitor1Id: competitor1Id.value,
        competitor2Id: competitor2Id.value
      }),
    warningMarkers,
    bonusForScore: scoreBonus
  }
}
