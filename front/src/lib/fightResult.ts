import type { CompetitionBlock, FightData, PendingTie } from '@/model'
import {
  applyFightWarningBonuses,
  getRequiredRoundScores,
  type RoundScore
} from '@shared/fightScoring'

export interface SubmittedCompetitionRoundScore {
  competitor1_score: number
  competitor2_score: number
  duration_seconds?: number
}

export interface SubmittedCompetitionFightWarning {
  competitor_id: number
  round: number
  reason: string
}

export interface SubmittedCompetitionFightResult {
  fight_id: number
  round_scores: SubmittedCompetitionRoundScore[]
  warnings: SubmittedCompetitionFightWarning[]
}

export const areFightResultsReady = (fights: FightData[]) =>
  fights.length > 0 && fights.every((fight) => fight.isResultValid)

export const getIncompleteFightNumbers = (fights: FightData[]) =>
  fights.filter((fight) => !fight.isResultValid).map((fight) => fight.number)

export const canShowGroupFightActions = (block: CompetitionBlock, pendingTie: PendingTie | null) =>
  block.type === 'GROUP' &&
  block.status === 'ACTIVE' &&
  block.lifecycleState === 'FIGHTS_EDITABLE' &&
  !(pendingTie?.blockId === block.id && (pendingTie.scope ?? 'GROUP') === 'GROUP')

export const getSubmittedRoundScores = (fight: FightData): RoundScore[] => {
  const adjustedScore = applyFightWarningBonuses(
    { rounds: fight.rounds, roundWin: fight.roundWin },
    {
      competitor1Id: fight.competitor1Id ?? 0,
      competitor2Id: fight.competitor2Id ?? 0,
      warnings: fight.warnings ?? []
    },
    fight.roundScores
  )
  const requiredAdjustedRounds = getRequiredRoundScores(
    { rounds: fight.rounds, roundWin: fight.roundWin },
    adjustedScore.roundScores
  )
  const lastWarningRound = Math.max(0, ...(fight.warnings ?? []).map((warning) => warning.round))
  const requiredRoundCount = Math.max(requiredAdjustedRounds.length, lastWarningRound)

  return fight.roundScores.slice(0, requiredRoundCount)
}

const roundDurationSeconds = (fight: FightData, roundIndex: number) =>
  roundIndex + 1 <= fight.rounds ? (fight.mainRoundTime ?? 0) : (fight.additionalRoundTime ?? 0)

export const buildSubmittedFightResult = (fight: FightData): SubmittedCompetitionFightResult => ({
  fight_id: fight.id,
  round_scores: getSubmittedRoundScores(fight).map((score, index) => ({
    competitor1_score: score.competitor1Score,
    competitor2_score: score.competitor2Score,
    duration_seconds: score.durationSeconds ?? roundDurationSeconds(fight, index)
  })),
  warnings: (fight.warnings ?? []).map((warning) => ({
    competitor_id: warning.competitorId,
    round: warning.round,
    reason: warning.reason
  }))
})
