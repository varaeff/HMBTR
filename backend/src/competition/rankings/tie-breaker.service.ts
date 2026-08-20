import { Injectable, NotFoundException } from '@nestjs/common';
import { WARNING_SCORE_BONUS } from '@shared/fightScoring';
import { scoringRules } from '../../fights/fight-score-data';
import type { PrismaTx } from '../competition-internal.types';
import { CompetitionScoringService } from '../scoring/competition-scoring.service';

export interface CompetitorTieBreakerMetric {
  competitorId: number;
  fighterId: number;
  activeYellowCount: number;
  effectiveScoreDiff: number;
}

export interface TieBreakerDecision {
  winnerCompetitorId: number | null;
  loserCompetitorId: number | null;
}

@Injectable()
export class TieBreakerService {
  constructor(private readonly scoringService: CompetitionScoringService) {}

  async getTournamentCheckDateTx(tx: PrismaTx, tournamentId: number) {
    const tournament = await tx.tournaments.findUnique({
      where: { id: tournamentId },
      select: { event_date: true },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');

    return this.toDateOnly(tournament.event_date ?? new Date());
  }

  async getMetricsTx(
    tx: PrismaTx,
    params: {
      tournamentId: number;
      nominationId: number;
      competitorIds: number[];
      excludeFightId?: number;
    },
  ) {
    const uniqueCompetitorIds = [...new Set(params.competitorIds)];
    const competitors = await tx.competitors.findMany({
      where: { id: { in: uniqueCompetitorIds } },
      select: { id: true, fighter_id: true },
    });
    const metrics = new Map<number, CompetitorTieBreakerMetric>();
    for (const competitor of competitors) {
      metrics.set(competitor.id, {
        competitorId: competitor.id,
        fighterId: competitor.fighter_id,
        activeYellowCount: 0,
        effectiveScoreDiff: 0,
      });
    }

    const checkDate = await this.getTournamentCheckDateTx(
      tx,
      params.tournamentId,
    );
    const fighterIds = competitors.map((competitor) => competitor.fighter_id);
    const yellowCards = await tx.disciplinary_cards.findMany({
      where: {
        tournament_id: params.tournamentId,
        fighter_id: { in: fighterIds },
        type: 'YELLOW',
        active: true,
        received_at: { lte: checkDate },
        expires_at: { gte: checkDate },
      },
      select: { fighter_id: true },
    });
    const competitorIdByFighterId = new Map(
      competitors.map((competitor) => [competitor.fighter_id, competitor.id]),
    );
    for (const card of yellowCards) {
      const competitorId = competitorIdByFighterId.get(card.fighter_id);
      const metric =
        competitorId === undefined ? undefined : metrics.get(competitorId);
      if (metric) metric.activeYellowCount++;
    }

    const fights = await tx.fights.findMany({
      where: {
        tournament_id: params.tournamentId,
        nomination_id: params.nominationId,
        is_finished: true,
        ...(params.excludeFightId
          ? { id: { not: params.excludeFightId } }
          : {}),
        OR: [
          { competitor1_id: { in: uniqueCompetitorIds } },
          { competitor2_id: { in: uniqueCompetitorIds } },
        ],
      },
      include: {
        nomination: true,
        round_scores: { orderBy: { round: 'asc' } },
        warnings: true,
      },
    });

    for (const fight of fights) {
      const score = this.scoringService.getEffectiveFightAggregateScore({
        competitor1Id: fight.competitor1_id,
        competitor2Id: fight.competitor2_id,
        competitor1Score: fight.competitor1_score,
        competitor2Score: fight.competitor2_score,
        forfeitCardId: fight.forfeit_card_id,
        forfeitWithdrawalId: fight.forfeit_withdrawal_id,
        rules: scoringRules(fight),
        roundScores: this.scoringService.getPersistedRoundScores(fight),
        warnings: fight.warnings.map((warning) => ({
          competitorId: warning.competitor_id,
          round: warning.round,
          reason: warning.reason,
        })),
      });
      const first = metrics.get(fight.competitor1_id);
      const second = metrics.get(fight.competitor2_id);
      if (first) {
        first.effectiveScoreDiff +=
          score.competitor1Score - score.competitor2Score;
      }
      if (second) {
        second.effectiveScoreDiff +=
          score.competitor2Score - score.competitor1Score;
      }
    }

    for (const metric of metrics.values()) {
      metric.effectiveScoreDiff -=
        metric.activeYellowCount * WARNING_SCORE_BONUS;
    }

    return metrics;
  }

  resolvePair(
    first: CompetitorTieBreakerMetric,
    second: CompetitorTieBreakerMetric,
  ): TieBreakerDecision {
    if (first.activeYellowCount !== second.activeYellowCount) {
      return first.activeYellowCount < second.activeYellowCount
        ? {
            winnerCompetitorId: first.competitorId,
            loserCompetitorId: second.competitorId,
          }
        : {
            winnerCompetitorId: second.competitorId,
            loserCompetitorId: first.competitorId,
          };
    }

    if (first.effectiveScoreDiff !== second.effectiveScoreDiff) {
      return first.effectiveScoreDiff > second.effectiveScoreDiff
        ? {
            winnerCompetitorId: first.competitorId,
            loserCompetitorId: second.competitorId,
          }
        : {
            winnerCompetitorId: second.competitorId,
            loserCompetitorId: first.competitorId,
          };
    }

    return { winnerCompetitorId: null, loserCompetitorId: null };
  }

  private toDateOnly(value: string | Date) {
    const date = value instanceof Date ? value : new Date(value);

    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }
}
