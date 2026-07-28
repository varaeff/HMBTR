import { BadRequestException, Injectable } from '@nestjs/common';
import { scoringRules } from '../../fights/fight-score-data';
import { SCOPE_GROUP } from '../competition.constants';
import type { GroupRankings, PrismaTx } from '../competition-internal.types';
import { CompetitionScoringService } from '../scoring/competition-scoring.service';

@Injectable()
export class GroupRankingReader {
  constructor(private readonly scoringService: CompetitionScoringService) {}

  async getGroupRankingsTx(
    tx: PrismaTx,
    blockId: number,
    groupId: number,
  ): Promise<GroupRankings> {
    const groupCompetitors = await tx.group_competitors.findMany({
      where: { group_id: groupId },
      orderBy: { competitor_id: 'asc' },
    });
    const stats = groupCompetitors.map((gc) => ({
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
        roundScores: this.scoringService.getPersistedRoundScores(
          scoringRules(fight),
          fight,
          fight.warnings,
        ),
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

    const manualOrder = (
      await tx.competition_placements.findMany({
        where: { scope: SCOPE_GROUP, group_id: groupId },
        orderBy: { place: 'asc' },
      })
    ).map((placement) => placement.competitor_id);

    return { stats, manualOrder };
  }
}
