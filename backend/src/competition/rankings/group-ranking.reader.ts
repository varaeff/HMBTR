import { BadRequestException, Injectable } from '@nestjs/common';
import { WARNING_SCORE_BONUS } from '@shared/fightScoring';
import { scoringRules } from '../../fights/fight-score-data';
import type { RankedCompetitor } from '../competition.logic';
import { SCOPE_GROUP } from '../competition.constants';
import type { GroupRankings, PrismaTx } from '../competition-internal.types';
import { CompetitionScoringService } from '../scoring/competition-scoring.service';
import { TieBreakerService } from './tie-breaker.service';

@Injectable()
export class GroupRankingReader {
  constructor(
    private readonly scoringService: CompetitionScoringService,
    private readonly tieBreakerService: TieBreakerService,
  ) {}

  async getGroupRankingsTx(
    tx: PrismaTx,
    blockId: number,
    groupId: number,
  ): Promise<GroupRankings> {
    const block = await tx.competition_blocks.findUnique({
      where: { id: blockId },
      select: { tournament_id: true, nomination_id: true },
    });
    if (!block) throw new BadRequestException('Block not found');

    const groupCompetitors = await tx.group_competitors.findMany({
      where: { group_id: groupId },
      orderBy: { competitor_id: 'asc' },
    });
    const stats: RankedCompetitor[] = groupCompetitors.map((gc) => ({
      competitorId: gc.competitor_id,
      wins: 0,
      diff: 0,
    }));
    const statsMap = new Map(stats.map((stat) => [stat.competitorId, stat]));
    const fights = await tx.fights.findMany({
      where: { block_id: blockId, group_id: groupId },
      include: {
        warnings: true,
        nomination: true,
        round_scores: { orderBy: { round: 'asc' } },
      },
    });

    if (fights.some((fight) => !fight.is_finished)) {
      throw new BadRequestException('All group fights must be completed');
    }

    for (const fight of fights) {
      const s1 = statsMap.get(fight.competitor1_id);
      const s2 = statsMap.get(fight.competitor2_id);
      const score = this.scoringService.getEffectiveFightAggregateScore({
        competitor1Id: fight.competitor1_id,
        competitor2Id: fight.competitor2_id,
        competitor1Score: fight.competitor1_score,
        competitor2Score: fight.competitor2_score,
        forfeitCardId: fight.forfeit_card_id,
        rules: scoringRules(fight),
        roundScores: this.scoringService.getPersistedRoundScores(fight),
        warnings: fight.warnings.map((warning) => ({
          competitorId: warning.competitor_id,
          round: warning.round,
          reason: warning.reason,
        })),
      });
      if (s1) {
        s1.diff += score.competitor1Score - score.competitor2Score;
        if (fight.winner_id === fight.competitor1_id) s1.wins++;
      }
      if (s2) {
        s2.diff += score.competitor2Score - score.competitor1Score;
        if (fight.winner_id === fight.competitor2_id) s2.wins++;
      }
    }

    const tieBreakerMetrics = await this.tieBreakerService.getMetricsTx(tx, {
      tournamentId: block.tournament_id,
      nominationId: block.nomination_id,
      competitorIds: stats.map((stat) => stat.competitorId),
    });
    for (const stat of stats) {
      const metric = tieBreakerMetrics.get(stat.competitorId);
      stat.activeYellowCount = metric?.activeYellowCount ?? 0;
      stat.diff -= stat.activeYellowCount * WARNING_SCORE_BONUS;
    }

    const manualOrder = (
      await tx.competition_placements.findMany({
        where: { scope: SCOPE_GROUP, group_id: groupId },
        orderBy: { place: 'asc' },
      })
    ).map((placement) => placement.competitor_id);

    return { stats, manualOrder };
  }
}
