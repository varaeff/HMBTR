import type { FightData } from '@/model'
import {
  applyFightWarningBonuses,
  getInitialRoundScores
} from '@shared/fightScoring'

const hasWarningTechnicalLoss = (fight: FightData) => {
  const roundScores = fight.roundScores.length
    ? fight.roundScores
    : getInitialRoundScores({ rounds: fight.rounds, roundWin: fight.roundWin })

  return Boolean(
    applyFightWarningBonuses(
      { rounds: fight.rounds, roundWin: fight.roundWin },
      {
        competitor1Id: fight.competitor1Id ?? fight.fighter1.id,
        competitor2Id: fight.competitor2Id ?? fight.fighter2.id,
        warnings: fight.warnings ?? []
      },
      roundScores
    ).technicalLoserSide
  )
}

export const hasEditableRoundTimeInput = (fight: FightData) =>
  !fight.isFinished && !fight.forfeitCardId && !hasWarningTechnicalLoss(fight)

export const hasEditableRoundTimeInputs = (fights: FightData[]) =>
  fights.some(hasEditableRoundTimeInput)
