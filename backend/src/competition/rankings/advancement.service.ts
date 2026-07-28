import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { rankCompetitors, selectOlympicAdvancers } from '../competition.logic';
import type { RankedGroup } from '../competition.logic';
import { BLOCK_GROUP } from '../competition.constants';
import type { GroupRankings, PrismaTx } from '../competition-internal.types';
import { CompetitionRedCardService } from '../competition-red-card.service';
import { GroupRankingReader } from './group-ranking.reader';
import { PendingTieService } from './pending-tie.service';

@Injectable()
export class AdvancementService {
  constructor(
    private readonly pendingTieService: PendingTieService,
    private readonly groupRankingReader: GroupRankingReader,
    private readonly redCardService: CompetitionRedCardService,
  ) {}

  async getAdvancingCompetitorsTx(
    tx: PrismaTx,
    blockId: number,
    includeThirdPlaces = false,
  ) {
    const block = await tx.competition_blocks.findUnique({
      where: { id: blockId },
    });
    if (!block) throw new NotFoundException('Block not found');
    if (block.type !== BLOCK_GROUP) {
      throw new BadRequestException(
        'Only group blocks can produce subgroup advancers',
      );
    }

    const groups = await tx.groups.findMany({
      where: { block_id: blockId },
      orderBy: { name: 'asc' },
    });
    const pendingTie = await this.pendingTieService.getPendingTieTx(
      tx,
      blockId,
      2,
    );
    if (pendingTie) {
      throw new BadRequestException(
        'Resolve ranking ties before creating the next block',
      );
    }

    const rankedGroups: RankedGroup[] = [];
    const activeRedCompetitorIds =
      await this.redCardService.getActiveRedCompetitorIdsTx(tx, blockId);
    for (const group of groups) {
      const rankings = await this.groupRankingReader.getGroupRankingsTx(
        tx,
        blockId,
        group.id,
      );
      // Active-red competitors remain in standings, but cannot advance.
      const ranked = this.redCardService.excludeActiveRedCompetitors(
        rankCompetitors(rankings.stats, rankings.manualOrder),
        activeRedCompetitorIds,
      );
      rankedGroups.push({ name: group.name, ranked });
    }
    const thirdPlaceManualOrder =
      await this.pendingTieService.getOlympicThirdPlaceManualOrderTx(
        tx,
        blockId,
      );
    if (includeThirdPlaces) {
      const olympicThirdPlaceTie =
        await this.pendingTieService.getPendingOlympicThirdPlaceTieFromRankedTx(
          tx,
          blockId,
          rankedGroups,
          thirdPlaceManualOrder,
          new Map<string, GroupRankings>(),
          activeRedCompetitorIds,
        );
      if (olympicThirdPlaceTie) {
        throw new BadRequestException(
          'Resolve ranking ties before creating the next block',
        );
      }
    }

    const advancers = selectOlympicAdvancers(
      rankedGroups,
      includeThirdPlaces,
      thirdPlaceManualOrder,
    );
    const advancerIds = advancers.map((advancer) => advancer.competitorId);
    const competitors = await tx.competitors.findMany({
      where: { id: { in: advancerIds } },
      include: { fighter: true },
    });
    const competitorById = new Map(
      competitors.map((competitor) => [competitor.id, competitor]),
    );

    return advancers.map((advancer) => {
      const competitor = competitorById.get(advancer.competitorId);
      if (!competitor) {
        throw new BadRequestException('Advancing competitor not found');
      }

      return {
        ...competitor,
        olympicGroupName: advancer.groupName,
        olympicGroupPlace: advancer.groupPlace,
      };
    });
  }
}
