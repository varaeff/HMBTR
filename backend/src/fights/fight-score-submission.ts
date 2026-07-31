import { BadRequestException } from '@nestjs/common';
import {
  evaluateFightScore,
  MAX_SCORE,
  type FightScoreEvaluation,
  type FightScoringRules,
  type RoundScore,
} from '@shared/fightScoring';
import type { SubmittedFightScore } from './fight-score.types';

export const scoringRules = (nomination: {
  rounds: number;
  round_win: boolean;
}): FightScoringRules => ({
  rounds: nomination.rounds as FightScoringRules['rounds'],
  roundWin: nomination.round_win,
});

export const submittedRoundScores = (
  score: SubmittedFightScore,
): RoundScore[] =>
  (score.round_scores ?? []).map((round) => ({
    competitor1Score: round.competitor1_score,
    competitor2Score: round.competitor2_score,
  }));

const rejectAggregateScores = (score: SubmittedFightScore) => {
  const hasAnyAggregateScore =
    score.competitor1_score !== undefined ||
    score.competitor2_score !== undefined;

  if (hasAnyAggregateScore) {
    throw new BadRequestException('Fights require round scores only');
  }
};

export const evaluateSubmittedFightScore = (
  rules: FightScoringRules,
  score: SubmittedFightScore,
  requireWinner: boolean,
): FightScoreEvaluation => {
  rejectAggregateScores(score);
  if (!score.round_scores?.length) {
    throw new BadRequestException('Fights require round scores');
  }
  const evaluation = evaluateFightScore(rules, submittedRoundScores(score));

  if (
    !evaluation.isValidDraft ||
    (requireWinner && !evaluation.isValidResult)
  ) {
    throw new BadRequestException(evaluation.error ?? 'Invalid fight score');
  }

  return evaluation;
};

export const evaluateSubmittedRawFightScoreForPersistence = (
  rules: FightScoringRules,
  score: SubmittedFightScore,
): FightScoreEvaluation => {
  rejectAggregateScores(score);
  const roundScores = submittedRoundScores(score);
  if (!roundScores.length) {
    throw new BadRequestException('Fights require round scores');
  }
  if (
    ![1, 2, 3].includes(rules.rounds) ||
    (rules.roundWin && rules.rounds !== 3)
  ) {
    throw new BadRequestException('Invalid nomination scoring configuration');
  }
  if (roundScores.length < rules.rounds) {
    throw new BadRequestException(
      `Expected at least ${rules.rounds} round scores`,
    );
  }
  if (
    roundScores.some(
      (round) =>
        !Number.isSafeInteger(round.competitor1Score) ||
        !Number.isSafeInteger(round.competitor2Score) ||
        round.competitor1Score < 0 ||
        round.competitor2Score < 0 ||
        round.competitor1Score > MAX_SCORE ||
        round.competitor2Score > MAX_SCORE,
    )
  ) {
    throw new BadRequestException(
      'Scores must be non-negative 32-bit integers',
    );
  }

  const competitor1Total = roundScores.reduce(
    (total, round) => total + round.competitor1Score,
    0,
  );
  const competitor2Total = roundScores.reduce(
    (total, round) => total + round.competitor2Score,
    0,
  );
  if (competitor1Total > MAX_SCORE || competitor2Total > MAX_SCORE) {
    throw new BadRequestException(
      'Aggregate score exceeds the 32-bit integer limit',
    );
  }
  const competitor1RoundWins = roundScores.filter(
    (round) => round.competitor1Score > round.competitor2Score,
  ).length;
  const competitor2RoundWins = roundScores.filter(
    (round) => round.competitor2Score > round.competitor1Score,
  ).length;
  const winnerSide = rules.roundWin
    ? competitor1RoundWins === competitor2RoundWins
      ? null
      : competitor1RoundWins > competitor2RoundWins
        ? 1
        : 2
    : competitor1Total === competitor2Total
      ? null
      : competitor1Total > competitor2Total
        ? 1
        : 2;

  return {
    competitor1Total,
    competitor2Total,
    competitor1RoundWins,
    competitor2RoundWins,
    winnerSide,
    requiresTieBreakRound: winnerSide === null,
    isValidDraft: true,
    isValidResult: winnerSide !== null,
    error:
      winnerSide === null ? 'Every recorded fight must have a winner' : null,
  };
};
