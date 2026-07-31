import type { FightData } from '@/model/competition'
import {
  applyFightWarningBonuses,
  evaluateFightScore,
  type FightScoringRules,
  type FightWarning,
  type RoundScore
} from '@shared/fightScoring'

interface FightScoreSource {
  competitor1Id?: number
  competitor2Id?: number
  fighter1Score: number
  fighter2Score: number
  roundScores: RoundScore[]
  warnings?: FightWarning[]
  forfeitCardId?: number | null
}

export interface FightScoreDraft {
  roundScores?: RoundScore[]
  warnings?: FightWarning[]
}

export const evaluateFightWithWarnings = (
  rules: FightScoringRules,
  fight: FightScoreSource
) => {
  if (fight.forfeitCardId) {
    const evaluation = evaluateFightScore(
      rules,
      fight.roundScores.length
        ? fight.roundScores
        : [
            {
              competitor1Score: fight.fighter1Score,
              competitor2Score: fight.fighter2Score
            }
          ]
    )

    return {
      evaluation,
      fighter1EffectiveScore: fight.fighter1Score,
      fighter2EffectiveScore: fight.fighter2Score
    }
  }

  const adjusted = applyFightWarningBonuses(
    rules,
    {
      competitor1Id: fight.competitor1Id ?? 0,
      competitor2Id: fight.competitor2Id ?? 0,
      warnings: fight.warnings ?? []
    },
    fight.roundScores
  )
  const evaluation = evaluateFightScore(rules, adjusted.roundScores)

  return {
    evaluation: adjusted.technicalLoserSide
      ? {
          ...evaluation,
          winnerSide: adjusted.technicalLoserSide === 1 ? 2 : 1,
          isValidResult: true,
          error: null
        }
      : evaluation,
    fighter1EffectiveScore: adjusted.aggregateScore.competitor1Score,
    fighter2EffectiveScore: adjusted.aggregateScore.competitor2Score
  }
}

export const applyFightScoreDraft = (fight: FightData, draft: FightScoreDraft) => {
  const roundScores = draft.roundScores ?? fight.roundScores
  const warnings = draft.warnings ?? fight.warnings ?? []
  const scored = evaluateFightWithWarnings(
    { rounds: fight.rounds, roundWin: fight.roundWin },
    {
      competitor1Id: fight.competitor1Id,
      competitor2Id: fight.competitor2Id,
      fighter1Score: fight.fighter1Score,
      fighter2Score: fight.fighter2Score,
      roundScores,
      warnings,
      forfeitCardId: fight.forfeitCardId
    }
  )

  fight.roundScores = roundScores
  fight.warnings = warnings
  fight.fighter1Score = scored.evaluation.competitor1Total
  fight.fighter2Score = scored.evaluation.competitor2Total
  fight.fighter1EffectiveScore = scored.fighter1EffectiveScore
  fight.fighter2EffectiveScore = scored.fighter2EffectiveScore
  fight.isResultValid = scored.evaluation.isValidResult
  fight.winnerId =
    scored.evaluation.winnerSide === 1
      ? fight.competitor1Id
      : scored.evaluation.winnerSide === 2
        ? fight.competitor2Id
        : null
}
