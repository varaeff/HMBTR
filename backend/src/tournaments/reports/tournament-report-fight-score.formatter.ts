import { Injectable } from '@nestjs/common';
import {
  applyFightWarningBonuses,
  evaluateFightScore,
  formatFightResult,
  legacyRoundScoresFromColumns,
  type FightScoreEvaluation,
  type FightScoringRules,
  type FightWarning,
  type RoundScore,
  type WarningAdjustedScore,
} from '@shared/fightScoring';
import type { TournamentReportFight } from '../tournaments-internal.types';
import type { ReportCopy } from './tournament-report-copy';

@Injectable()
export class TournamentReportFightScoreFormatter {
  formatFightScore(fight: TournamentReportFight, copy: ReportCopy) {
    const nomination = fight.nomination ?? {
      rounds: 1,
      round_win: false,
      name_en: '',
      name_ru: '',
    };
    const rules: FightScoringRules = {
      rounds: nomination.rounds as FightScoringRules['rounds'],
      roundWin: nomination.round_win,
    };
    const warnings = this.getFightWarnings(fight);
    const rounds = this.getPersistedRoundScores(rules, fight, warnings);
    const adjusted = applyFightWarningBonuses(
      rules,
      {
        competitor1Id: fight.competitor1_id ?? 0,
        competitor2Id: fight.competitor2_id ?? 0,
        warnings,
      },
      rounds,
    );
    const evaluation = evaluateFightScore(rules, adjusted.roundScores);

    const displayEvaluation =
      fight.forfeit_card_id !== null
        ? {
            ...evaluation,
            competitor1Total: fight.competitor1_score,
            competitor2Total: fight.competitor2_score,
          }
        : evaluation;

    const score =
      warnings.length && fight.forfeit_card_id === null
        ? this.formatFightWarningScore(rules, displayEvaluation, adjusted)
        : formatFightResult(
            rules,
            displayEvaluation,
            rounds,
            fight.forfeit_card_id !== null,
          );
    const warningSummary =
      warnings.length > 0 ? `, ${copy.warning} x ${warnings.length}` : '';

    return `${score}${warningSummary}`;
  }

  getEffectiveFightAggregateScore(fight: TournamentReportFight) {
    if (fight.forfeit_card_id !== null) {
      return {
        competitor1Score: fight.competitor1_score,
        competitor2Score: fight.competitor2_score,
      };
    }

    const rules: FightScoringRules = {
      rounds: fight.nomination.rounds as FightScoringRules['rounds'],
      roundWin: fight.nomination.round_win,
    };
    const warnings = this.getFightWarnings(fight);
    const roundScores = this.getPersistedRoundScores(rules, fight, warnings);

    return applyFightWarningBonuses(
      rules,
      {
        competitor1Id: fight.competitor1_id ?? 0,
        competitor2Id: fight.competitor2_id ?? 0,
        warnings,
      },
      roundScores,
    ).aggregateScore;
  }

  private getFightWarnings(fight: TournamentReportFight): FightWarning[] {
    return fight.warnings.map((warning) => ({
      competitorId: warning.competitor_id,
      round: warning.round,
      reason: warning.reason,
    }));
  }

  private getPersistedRoundScores(
    rules: FightScoringRules,
    fight: TournamentReportFight,
    warnings: Array<{ round: number }>,
  ): RoundScore[] {
    if (fight.round_scores.length) {
      return fight.round_scores.map((score) => ({
        competitor1Score: score.competitor1_score,
        competitor2Score: score.competitor2_score,
      }));
    }

    return legacyRoundScoresFromColumns(
      rules,
      {
        competitor1Round1Score: fight.competitor1_round1_score,
        competitor2Round1Score: fight.competitor2_round1_score,
        competitor1Round2Score: fight.competitor1_round2_score,
        competitor2Round2Score: fight.competitor2_round2_score,
        competitor1Round3Score: fight.competitor1_round3_score,
        competitor2Round3Score: fight.competitor2_round3_score,
        competitor1Round4Score: fight.competitor1_round4_score,
        competitor2Round4Score: fight.competitor2_round4_score,
      },
      warnings,
    );
  }

  private formatFightWarningScore(
    rules: FightScoringRules,
    evaluation: FightScoreEvaluation,
    adjusted: WarningAdjustedScore,
  ) {
    if (adjusted.technicalLoserSide) {
      return formatFightResult(rules, evaluation, adjusted.roundScores, false);
    }

    const scorePart = (score: number, bonus: number) =>
      `${score}${bonus > 0 ? `+${bonus}` : ''}`;

    if (rules.rounds === 1 && adjusted.scoreParts.length === 1) {
      const part = adjusted.scoreParts[0];
      return `${scorePart(part.competitor1Score, part.competitor1Bonus)}:${scorePart(
        part.competitor2Score,
        part.competitor2Bonus,
      )}`;
    }

    const leadingScore = rules.roundWin
      ? `${evaluation.competitor1RoundWins}:${evaluation.competitor2RoundWins}`
      : `${adjusted.aggregateScore.competitor1Score}:${adjusted.aggregateScore.competitor2Score}`;
    const breakdown = adjusted.scoreParts
      .map(
        (part) =>
          `${scorePart(part.competitor1Score, part.competitor1Bonus)}:${scorePart(
            part.competitor2Score,
            part.competitor2Bonus,
          )}`,
      )
      .join(', ');

    return `${leadingScore} (${breakdown})`;
  }
}
