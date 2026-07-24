import { BadRequestException } from '@nestjs/common';
import {
  applyFightWarningBonuses,
  evaluateFightScore,
  getFightWarningCount,
  MAX_FIGHT_WARNINGS_PER_COMPETITOR,
  type FightScoreEvaluation,
  type FightScoringRules,
  type FightWarning,
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
  warnings?: SubmittedFightWarning[];
}

export interface SubmittedFightWarning {
  competitor_id: number;
  round: number;
  reason: string;
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

export const submittedRoundScores = (
  score: SubmittedFightScore,
): RoundScore[] =>
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
    score.competitor1_score !== undefined &&
    score.competitor2_score !== undefined;
  const hasAnyAggregateScore =
    score.competitor1_score !== undefined ||
    score.competitor2_score !== undefined;
  if (rules.rounds === 1 && !hasBothAggregateScores) {
    throw new BadRequestException(
      'Single-round fights require both aggregate scores',
    );
  }
  if (rules.rounds > 1 && hasAnyAggregateScore) {
    throw new BadRequestException(
      'Multi-round fights require round scores only',
    );
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

  if (
    !evaluation.isValidDraft ||
    (requireWinner && !evaluation.isValidResult)
  ) {
    throw new BadRequestException(evaluation.error ?? 'Invalid fight score');
  }

  return evaluation;
};

export const submittedFightWarnings = (
  score: SubmittedFightScore,
): FightWarning[] =>
  (score.warnings ?? []).map((warning) => ({
    competitorId: warning.competitor_id,
    round: warning.round,
    reason: (warning.reason ?? '').trim(),
  }));

export const validateSubmittedFightWarnings = (
  rules: FightScoringRules,
  score: SubmittedFightScore,
  competitor1Id: number,
  competitor2Id: number,
) => {
  const warnings = submittedFightWarnings(score);
  const validCompetitorIds = new Set([competitor1Id, competitor2Id]);
  const roundCount =
    rules.rounds === 1 ? 1 : submittedRoundScores(score).length;

  for (const warning of warnings) {
    if (!warning.reason) {
      throw new BadRequestException('Warning reason is required');
    }
    if (!validCompetitorIds.has(warning.competitorId)) {
      throw new BadRequestException(
        'Warning competitor does not belong to the fight',
      );
    }
    if (rules.rounds === 1 && warning.round !== 1) {
      throw new BadRequestException(
        'Single-round fight warnings must use round 1',
      );
    }
    if (rules.rounds > 1 && (warning.round < 1 || warning.round > roundCount)) {
      throw new BadRequestException(
        'Warning round is not available for the fight score',
      );
    }
    if (warning.round === 4 && (!rules.roundWin || roundCount !== 4)) {
      throw new BadRequestException(
        'Round 4 warning requires an active tie-break round',
      );
    }
  }

  const competitor1Warnings = getFightWarningCount(warnings, competitor1Id);
  const competitor2Warnings = getFightWarningCount(warnings, competitor2Id);

  if (
    competitor1Warnings > MAX_FIGHT_WARNINGS_PER_COMPETITOR ||
    competitor2Warnings > MAX_FIGHT_WARNINGS_PER_COMPETITOR
  ) {
    throw new BadRequestException(
      'A competitor can receive at most three warnings in a fight',
    );
  }
  if (
    competitor1Warnings >= MAX_FIGHT_WARNINGS_PER_COMPETITOR &&
    competitor2Warnings >= MAX_FIGHT_WARNINGS_PER_COMPETITOR
  ) {
    throw new BadRequestException(
      'Only one competitor can lose a fight by warnings',
    );
  }

  return warnings;
};

export const evaluateSubmittedFightScoreWithWarnings = (
  rules: FightScoringRules,
  score: SubmittedFightScore,
  competitor1Id: number,
  competitor2Id: number,
  requireWinner: boolean,
) => {
  evaluateSubmittedFightScore(rules, score, false);
  const warnings = validateSubmittedFightWarnings(
    rules,
    score,
    competitor1Id,
    competitor2Id,
  );
  const adjusted = applyFightWarningBonuses(
    rules,
    { competitor1Id, competitor2Id, warnings },
    submittedRoundScores(score),
    score.competitor1_score !== undefined &&
      score.competitor2_score !== undefined
      ? {
          competitor1Score: score.competitor1_score,
          competitor2Score: score.competitor2_score,
        }
      : undefined,
  );

  if (adjusted.technicalLoserSide) {
    const winnerSide = adjusted.technicalLoserSide === 1 ? 2 : 1;
    return {
      ...evaluateFightScore(
        rules,
        rules.rounds === 1 ? [] : adjusted.roundScores,
        rules.rounds === 1 ? adjusted.aggregateScore : undefined,
      ),
      winnerSide,
      isValidDraft: true,
      isValidResult: true,
      error: null,
      warnings,
      technicalLoserSide: adjusted.technicalLoserSide,
    };
  }

  const evaluation = evaluateFightScore(
    rules,
    rules.rounds === 1 ? [] : adjusted.roundScores,
    rules.rounds === 1 ? adjusted.aggregateScore : undefined,
  );

  if (
    !evaluation.isValidDraft ||
    (requireWinner && !evaluation.isValidResult)
  ) {
    throw new BadRequestException(evaluation.error ?? 'Invalid fight score');
  }

  return {
    ...evaluation,
    warnings,
    technicalLoserSide: adjusted.technicalLoserSide,
  };
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
