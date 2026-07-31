import { BadRequestException } from '@nestjs/common';
import {
  applyFightWarningBonuses,
  evaluateFightScore,
  getFightWarningCount,
  MAX_FIGHT_WARNINGS_PER_COMPETITOR,
  type FightScoringRules,
  type FightWarning,
} from '@shared/fightScoring';
import type { SubmittedFightScore } from './fight-score.types';
import {
  evaluateSubmittedRawFightScoreForPersistence,
  submittedRoundScores,
} from './fight-score-submission';

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
  const roundCount = submittedRoundScores(score).length;

  for (const warning of warnings) {
    if (!warning.reason) {
      throw new BadRequestException('Warning reason is required');
    }
    if (!validCompetitorIds.has(warning.competitorId)) {
      throw new BadRequestException(
        'Warning competitor does not belong to the fight',
      );
    }
    if (warning.round < 1 || warning.round > roundCount) {
      throw new BadRequestException(
        'Warning round is not available for the fight score',
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
  evaluateSubmittedRawFightScoreForPersistence(rules, score);
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
      ...evaluateFightScore(rules, adjusted.roundScores),
      winnerSide,
      isValidDraft: true,
      isValidResult: true,
      error: null,
      warnings,
      technicalLoserSide: adjusted.technicalLoserSide,
    };
  }

  const evaluation = evaluateFightScore(rules, adjusted.roundScores);

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
