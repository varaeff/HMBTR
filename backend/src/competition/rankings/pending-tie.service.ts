import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  findThirdPlaceAdvancementTie,
  findTieForPlaces,
  getOlympicThirdPlaceShortfall,
  rankCompetitors,
  selectOlympicAdvancers,
} from '../competition.logic';
import type { RankedGroup } from '../competition.logic';
import {
  BLOCK_GROUP,
  SCOPE_GROUP,
  SCOPE_OLYMPIC_THIRD,
} from '../competition.constants';
import type {
  GroupRankings,
  PendingTieResult,
  PrismaTx,
} from '../competition-internal.types';
import { CompetitionRedCardService } from '../competition-red-card.service';
import { GroupRankingReader } from './group-ranking.reader';

@Injectable()
export class PendingTieService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupRankingReader: GroupRankingReader,
    private readonly redCardService: CompetitionRedCardService,
  ) {}

  getPendingTie(
    blockId: number,
    places: number,
  ): Promise<PendingTieResult | null> {
    return this.getPendingTieTx(this.prisma, blockId, places);
  }

  async getPendingTieTx(
    tx: PrismaTx,
    blockId: number,
    places: number,
  ): Promise<PendingTieResult | null> {
    const block = await tx.competition_blocks.findUnique({
      where: { id: blockId },
    });
    if (!block || block.type !== BLOCK_GROUP) return null;
    const fightsCount = await tx.fights.count({ where: { block_id: blockId } });
    if (fightsCount === 0) return null;

    const groups = await tx.groups.findMany({
      where: { block_id: blockId },
      orderBy: { name: 'asc' },
    });
    const activeRedCompetitorIds =
      await this.redCardService.getActiveRedCompetitorIdsTx(tx, blockId);

    for (const group of groups) {
      try {
        const rankings = await this.groupRankingReader.getGroupRankingsTx(
          tx,
          blockId,
          group.id,
        );
        const ranked = this.redCardService.excludeActiveRedCompetitors(
          rankCompetitors(rankings.stats, rankings.manualOrder),
          activeRedCompetitorIds,
        );
        const unresolved = findTieForPlaces(ranked, places).filter(
          (competitorId) => !rankings.manualOrder.includes(competitorId),
        );
        if (unresolved.length) {
          return {
            blockId,
            groupId: group.id,
            competitorIds: unresolved,
            scope: SCOPE_GROUP,
          };
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  async getOlympicThirdPlaceManualOrderTx(tx: PrismaTx, blockId: number) {
    return (
      await tx.competition_placements.findMany({
        where: { scope: SCOPE_OLYMPIC_THIRD, block_id: blockId },
        orderBy: { place: 'asc' },
      })
    ).map((placement) => placement.competitor_id);
  }

  async getPendingOlympicThirdPlaceTieTx(
    tx: PrismaTx,
    blockId: number,
  ): Promise<PendingTieResult | null> {
    const block = await tx.competition_blocks.findUnique({
      where: { id: blockId },
    });
    if (!block || block.type !== BLOCK_GROUP) return null;

    const groups = await tx.groups.findMany({
      where: { block_id: blockId },
      orderBy: { name: 'asc' },
    });
    const rankedGroups: RankedGroup[] = [];
    const groupRankings = new Map<string, GroupRankings>();
    const activeRedCompetitorIds =
      await this.redCardService.getActiveRedCompetitorIdsTx(tx, blockId);

    for (const group of groups) {
      try {
        const rankings = await this.groupRankingReader.getGroupRankingsTx(
          tx,
          blockId,
          group.id,
        );
        const ranked = this.redCardService.excludeActiveRedCompetitors(
          rankCompetitors(rankings.stats, rankings.manualOrder),
          activeRedCompetitorIds,
        );
        rankedGroups.push({ name: group.name, ranked });
        groupRankings.set(group.name, rankings);
      } catch {
        return null;
      }
    }

    const thirdPlaceManualOrder = await this.getOlympicThirdPlaceManualOrderTx(
      tx,
      blockId,
    );

    return this.getPendingOlympicThirdPlaceTieFromRankedTx(
      tx,
      blockId,
      rankedGroups,
      thirdPlaceManualOrder,
      groupRankings,
      activeRedCompetitorIds,
    );
  }

  async getPendingOlympicThirdPlaceTieFromRankedTx(
    tx: PrismaTx,
    blockId: number,
    rankedGroups: RankedGroup[],
    thirdPlaceManualOrder: number[],
    cachedGroupRankings = new Map<string, GroupRankings>(),
    activeRedCompetitorIds = new Set<number>(),
  ): Promise<PendingTieResult | null> {
    const shortfall = getOlympicThirdPlaceShortfall(rankedGroups);
    if (shortfall <= 0) return null;

    const thirdPlaceCount = rankedGroups.filter(
      (group) => group.ranked.length >= 3,
    ).length;
    if (thirdPlaceCount < shortfall) return null;

    const selectedThirdPlaces = selectOlympicAdvancers(
      rankedGroups,
      true,
      thirdPlaceManualOrder,
    ).filter((advancer) => advancer.groupPlace === 3);
    const unresolvedThirdPlaceTie = findThirdPlaceAdvancementTie(
      rankedGroups,
      thirdPlaceManualOrder,
    );
    const thirdPlaceGroupNamesToCheck = new Set(
      selectedThirdPlaces.map((thirdPlace) => thirdPlace.groupName),
    );
    for (const rankedGroup of rankedGroups) {
      const thirdPlace = rankedGroup.ranked[2];
      if (
        thirdPlace &&
        unresolvedThirdPlaceTie.includes(thirdPlace.competitorId)
      ) {
        thirdPlaceGroupNamesToCheck.add(rankedGroup.name);
      }
    }

    const groups = await tx.groups.findMany({
      where: { block_id: blockId },
      orderBy: { name: 'asc' },
    });
    const groupByName = new Map(groups.map((group) => [group.name, group]));

    for (const groupName of thirdPlaceGroupNamesToCheck) {
      const group = groupByName.get(groupName);
      if (!group) continue;

      const cachedRankings = cachedGroupRankings.get(group.name);
      const rankings =
        cachedRankings ??
        (await this.groupRankingReader.getGroupRankingsTx(
          tx,
          blockId,
          group.id,
        ));
      const ranked = this.redCardService.excludeActiveRedCompetitors(
        rankCompetitors(rankings.stats, rankings.manualOrder),
        activeRedCompetitorIds,
      );
      const unresolved = findTieForPlaces(ranked, 3).filter(
        (competitorId) => !rankings.manualOrder.includes(competitorId),
      );

      if (unresolved.length) {
        return {
          blockId,
          groupId: group.id,
          competitorIds: unresolved,
          scope: SCOPE_GROUP,
        };
      }
    }

    if (unresolvedThirdPlaceTie.length) {
      return {
        blockId,
        groupId: null,
        competitorIds: unresolvedThirdPlaceTie,
        scope: SCOPE_OLYMPIC_THIRD,
      };
    }

    return null;
  }
}
