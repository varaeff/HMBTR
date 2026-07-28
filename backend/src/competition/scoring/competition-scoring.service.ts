import { Injectable } from '@nestjs/common';
import {
  applyFightWarningBonuses,
  legacyRoundScoresFromColumns,
  type FightScoringRules,
  type RoundScore,
} from '@shared/fightScoring';
import { PrismaService } from '../../prisma/prisma.service';
import type { PrismaTx } from '../competition-internal.types';

@Injectable()
export class CompetitionScoringService {
  constructor(private readonly prisma: PrismaService) {}

  getPersistedRoundScores(
    rules: FightScoringRules,
    fight: {
      competitor1_round1_score: number;
      competitor2_round1_score: number;
      competitor1_round2_score: number;
      competitor2_round2_score: number;
      competitor1_round3_score: number;
      competitor2_round3_score: number;
      competitor1_round4_score: number;
      competitor2_round4_score: number;
      round_scores?: Array<{
        competitor1_score: number;
        competitor2_score: number;
      }>;
    },
    warnings: Array<{ round: number }>,
  ): RoundScore[] {
    // Round-score snapshots win over legacy score columns after fixation.
    if (fight.round_scores?.length) {
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

  getEffectiveFightAggregateScore(params: {
    competitor1Id: number;
    competitor2Id: number;
    competitor1Score: number;
    competitor2Score: number;
    roundScores: RoundScore[];
    forfeitCardId: number | null;
    rules: FightScoringRules;
    warnings: Array<{ competitorId: number; round: number; reason: string }>;
  }) {
    if (params.forfeitCardId !== null) {
      return {
        competitor1Score: params.competitor1Score,
        competitor2Score: params.competitor2Score,
      };
    }

    return applyFightWarningBonuses(
      params.rules,
      {
        competitor1Id: params.competitor1Id,
        competitor2Id: params.competitor2Id,
        warnings: params.warnings,
      },
      params.roundScores,
    ).aggregateScore;
  }

  async replaceFightRoundScores(fightId: number, roundScores: RoundScore[]) {
    await this.prisma.$transaction(async (tx) => {
      await this.replaceFightRoundScoresTx(tx, fightId, roundScores);
    });
  }

  async replaceFightRoundScoresTx(
    tx: PrismaTx,
    fightId: number,
    roundScores: RoundScore[],
  ) {
    await tx.fight_round_scores.deleteMany({ where: { fight_id: fightId } });
    if (!roundScores.length) return;

    await tx.fight_round_scores.createMany({
      data: roundScores.map((score, index) => ({
        fight_id: fightId,
        round: index + 1,
        competitor1_score: score.competitor1Score,
        competitor2_score: score.competitor2Score,
      })),
    });
  }

  getRedCardForfeitScoreData(
    rounds: number,
    roundWin: boolean,
    firstLoses: boolean,
  ) {
    const winnerScore = roundWin ? rounds : 10;
    const winnerRoundScore = roundWin ? 5 : 0;
    const roundScore = (round: number, firstCompetitor: boolean) =>
      roundWin && round <= rounds && firstCompetitor !== firstLoses
        ? winnerRoundScore
        : 0;

    return {
      competitor1_score: firstLoses ? 0 : winnerScore,
      competitor2_score: firstLoses ? winnerScore : 0,
      competitor1_round1_score: roundScore(1, true),
      competitor2_round1_score: roundScore(1, false),
      competitor1_round2_score: roundScore(2, true),
      competitor2_round2_score: roundScore(2, false),
      competitor1_round3_score: roundScore(3, true),
      competitor2_round3_score: roundScore(3, false),
      competitor1_round4_score: 0,
      competitor2_round4_score: 0,
    };
  }

  getRedCardForfeitRoundScores(
    rounds: number,
    roundWin: boolean,
    firstLoses: boolean,
  ): RoundScore[] {
    const winnerRoundScore = roundWin ? 5 : 0;
    return Array.from({ length: rounds }, () => ({
      competitor1Score: roundWin && !firstLoses ? winnerRoundScore : 0,
      competitor2Score: roundWin && firstLoses ? winnerRoundScore : 0,
    }));
  }
}
