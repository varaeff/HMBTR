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
  score: SubmittedFightScore,
): FightScoreUpdateData => {
  const rounds = submittedRoundScores(score);
  const value = (round: number, competitor: 1 | 2) => {
    const scoreValue = rounds[round - 1];
    return competitor === 1
      ? (scoreValue?.competitor1Score ?? 0)
      : (scoreValue?.competitor2Score ?? 0);
  };

  return {
    competitor1_score: evaluation.competitor1Total,
    competitor2_score: evaluation.competitor2Total,
    competitor1_round1_score: value(1, 1),
    competitor2_round1_score: value(1, 2),
    competitor1_round2_score: value(2, 1),
    competitor2_round2_score: value(2, 2),
    competitor1_round3_score: value(3, 1),
    competitor2_round3_score: value(3, 2),
    competitor1_round4_score: value(4, 1),
    competitor2_round4_score: value(4, 2),
  };
};
