import { BadRequestException } from '@nestjs/common';
import {
  evaluateFightScore,
  type FightScoreEvaluation,
  type FightScoringRules,
  type RoundScore,
} from '@shared/fightScoring';

export interface SubmittedRoundScore {
  competitor1_score: number;
  competitor2_score: number;
}

export interface SubmittedFightScore {
  competitor1_score?: number;
  competitor2_score?: number;
  round_scores?: SubmittedRoundScore[];
}

export interface FightScoreUpdateData {
  competitor1_score: number;
  competitor2_score: number;
  competitor1_round1_score: number;
  competitor2_round1_score: number;
  competitor1_round2_score: number;
  competitor2_round2_score: number;
  competitor1_round3_score: number;
  competitor2_round3_score: number;
  competitor1_round4_score: number;
  competitor2_round4_score: number;
}

export const scoringRules = (nomination: {
  rounds: number;
  round_win: boolean;
}): FightScoringRules => ({
  rounds: nomination.rounds as FightScoringRules['rounds'],
  roundWin: nomination.round_win,
});

export const submittedRoundScores = (score: SubmittedFightScore): RoundScore[] =>
  (score.round_scores ?? []).map((round) => ({
    competitor1Score: round.competitor1_score,
    competitor2Score: round.competitor2_score,
  }));

export const evaluateSubmittedFightScore = (
  rules: FightScoringRules,
  score: SubmittedFightScore,
  requireWinner: boolean,
): FightScoreEvaluation => {
  const hasBothAggregateScores =
    score.competitor1_score !== undefined && score.competitor2_score !== undefined;
  const hasAnyAggregateScore =
    score.competitor1_score !== undefined || score.competitor2_score !== undefined;
  if (rules.rounds === 1 && !hasBothAggregateScores) {
    throw new BadRequestException('Single-round fights require both aggregate scores');
  }
  if (rules.rounds > 1 && hasAnyAggregateScore) {
    throw new BadRequestException('Multi-round fights require round scores only');
  }
  const evaluation = evaluateFightScore(
    rules,
    submittedRoundScores(score),
    hasBothAggregateScores
      ? {
          competitor1Score: score.competitor1_score!,
          competitor2Score: score.competitor2_score!,
        }
      : undefined,
  );

  if (!evaluation.isValidDraft || (requireWinner && !evaluation.isValidResult)) {
    throw new BadRequestException(evaluation.error ?? 'Invalid fight score');
  }

  return evaluation;
};

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
