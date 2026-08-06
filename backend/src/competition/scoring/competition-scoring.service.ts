import { Injectable } from '@nestjs/common';
import {
  applyFightWarningBonuses,
  type FightScoringRules,
  type RoundScore,
} from '@shared/fightScoring';
import { PrismaService } from '../../prisma/prisma.service';
import type { PrismaTx } from '../competition-internal.types';

@Injectable()
export class CompetitionScoringService {
  constructor(private readonly prisma: PrismaService) {}

  getPersistedRoundScores(fight: {
    round_scores: Array<{
      competitor1_score: number;
      competitor2_score: number;
    }>;
  }): RoundScore[] {
    return fight.round_scores.map((score) => ({
      competitor1Score: score.competitor1_score,
      competitor2Score: score.competitor2_score,
    }));
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

    return {
      competitor1_score: firstLoses ? 0 : winnerScore,
      competitor2_score: firstLoses ? winnerScore : 0,
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
