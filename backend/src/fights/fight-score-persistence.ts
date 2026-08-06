import type { FightScoreEvaluation } from '@shared/fightScoring';
import type {
  FightRoundScoreCreateData,
  FightScoreUpdateData,
  SubmittedFightScore,
} from './fight-score.types';
import { submittedRoundScores } from './fight-score-submission';

export const fightRoundScoreCreateData = (
  score: SubmittedFightScore,
): FightRoundScoreCreateData[] =>
  submittedRoundScores(score).map((round, index) => ({
    round: index + 1,
    competitor1_score: round.competitor1Score,
    competitor2_score: round.competitor2Score,
  }));

export const fightScoreUpdateData = (
  evaluation: FightScoreEvaluation,
): FightScoreUpdateData => {
  return {
    competitor1_score: evaluation.competitor1Total,
    competitor2_score: evaluation.competitor2Total,
  };
};
