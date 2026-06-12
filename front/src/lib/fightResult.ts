import type { CompetitionBlock, FightData, PendingTie } from '@/model'
import { evaluateFightScore, type RoundScore } from '@shared/fightScoring'

export const areFightResultsReady = (fights: FightData[]) =>
  fights.length > 0 && fights.every((fight) => fight.isResultValid)

export const canShowGroupFightActions = (block: CompetitionBlock, pendingTie: PendingTie | null) =>
  block.type === 'GROUP' &&
  block.status === 'ACTIVE' &&
  block.lifecycleState === 'FIGHTS_EDITABLE' &&
  !(pendingTie?.blockId === block.id && (pendingTie.scope ?? 'GROUP') === 'GROUP')

export const getSubmittedRoundScores = (fight: FightData): RoundScore[] => {
  if (fight.rounds === 1) return []

  const normalRounds = fight.roundScores.slice(0, fight.rounds)
  if (!fight.roundWin) return normalRounds

  const evaluation = evaluateFightScore(
    { rounds: fight.rounds, roundWin: fight.roundWin },
    normalRounds
  )

  return evaluation.requiresTieBreakRound ? fight.roundScores.slice(0, 4) : normalRounds
}
