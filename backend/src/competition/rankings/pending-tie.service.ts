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
  BLOCK_OLYMPIC,
  SCOPE_GROUP,
  SCOPE_OLYMPIC_DOUBLE_RED,
  SCOPE_OLYMPIC_THIRD,
  STATUS_ACTIVE,
} from '../competition.constants';
import type {
  GroupRankings,
  PendingTieResult,
  PrismaTx,
} from '../competition-internal.types';
import { CompetitionRedCardService } from '../competition-red-card.service';
import {
  canApplyRedCardForfeitToFight,
  getApplicableRedForFight,
} from '../red-cards/red-card-policy';
import { RedCardStorageService } from '../red-cards/red-card-storage.service';
import { CompetitionWithdrawalService } from '../withdrawals/competition-withdrawal.service';
import { GroupRankingReader } from './group-ranking.reader';
import { TieBreakerService } from './tie-breaker.service';

@Injectable()
export class PendingTieService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupRankingReader: GroupRankingReader,
    private readonly redCardService: CompetitionRedCardService,
    private readonly redCardStorageService: RedCardStorageService,
    private readonly tieBreakerService: TieBreakerService,
    private readonly withdrawalService: CompetitionWithdrawalService,
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
    const activeWithdrawalCompetitorIds =
      await this.withdrawalService.getActiveWithdrawalCompetitorIdsTx(
        tx,
        blockId,
      );

    for (const group of groups) {
      try {
        const rankings = await this.groupRankingReader.getGroupRankingsTx(
          tx,
          blockId,
          group.id,
        );
        const ranked =
          this.withdrawalService.excludeActiveWithdrawalCompetitors(
            this.redCardService.excludeActiveRedCompetitors(
              rankCompetitors(rankings.stats, rankings.manualOrder),
              activeRedCompetitorIds,
            ),
            activeWithdrawalCompetitorIds,
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
    const activeWithdrawalCompetitorIds =
      await this.withdrawalService.getActiveWithdrawalCompetitorIdsTx(
        tx,
        blockId,
      );

    for (const group of groups) {
      try {
        const rankings = await this.groupRankingReader.getGroupRankingsTx(
          tx,
          blockId,
          group.id,
        );
        const ranked =
          this.withdrawalService.excludeActiveWithdrawalCompetitors(
            this.redCardService.excludeActiveRedCompetitors(
              rankCompetitors(rankings.stats, rankings.manualOrder),
              activeRedCompetitorIds,
            ),
            activeWithdrawalCompetitorIds,
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
      activeWithdrawalCompetitorIds,
    );
  }

  async getPendingOlympicThirdPlaceTieFromRankedTx(
    tx: PrismaTx,
    blockId: number,
    rankedGroups: RankedGroup[],
    thirdPlaceManualOrder: number[],
    cachedGroupRankings = new Map<string, GroupRankings>(),
    activeRedCompetitorIds = new Set<number>(),
    activeWithdrawalCompetitorIds = new Set<number>(),
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
      const ranked = this.withdrawalService.excludeActiveWithdrawalCompetitors(
        this.redCardService.excludeActiveRedCompetitors(
          rankCompetitors(rankings.stats, rankings.manualOrder),
          activeRedCompetitorIds,
        ),
        activeWithdrawalCompetitorIds,
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

  async getPendingOlympicDoubleRedTieTx(
    tx: PrismaTx,
    blockId: number,
  ): Promise<PendingTieResult | null> {
    const block = await tx.competition_blocks.findUnique({
      where: { id: blockId },
      include: {
        tournament_nomination: true,
        round_states: true,
      },
    });
    if (!block || block.type !== BLOCK_OLYMPIC) return null;
    if (
      block.status !== STATUS_ACTIVE ||
      block.tournament_nomination.is_finished
    ) {
      return null;
    }

    const fights = await tx.fights.findMany({
      where: {
        block_id: blockId,
        is_finished: false,
      },
      include: {
        block: {
          include: {
            tournament_nomination: true,
            round_states: true,
          },
        },
        competitor1: true,
        competitor2: true,
      },
      orderBy: [
        { bracket_round: 'asc' },
        { bracket_position: 'asc' },
        { fight_number: 'asc' },
      ],
    });
    if (!fights.length) return null;

    if (await this.redCardStorageService.disciplinaryCardStorageExists()) {
      const checkDate = await this.tieBreakerService.getTournamentCheckDateTx(
        tx,
        block.tournament_id,
      );
      const fighterIds = [
        ...new Set(
          fights.flatMap((fight) => [
            fight.competitor1.fighter_id,
            fight.competitor2.fighter_id,
          ]),
        ),
      ];
      const activeReds = await this.redCardStorageService.getActiveRedCards(
        fighterIds,
        checkDate,
      );

      for (const fight of fights) {
        if (!canApplyRedCardForfeitToFight(fight)) continue;

        const firstRed = getApplicableRedForFight(
          fight,
          activeReds.filter(
            (card) => card.fighter_id === fight.competitor1.fighter_id,
          ),
        );
        const secondRed = getApplicableRedForFight(
          fight,
          activeReds.filter(
            (card) => card.fighter_id === fight.competitor2.fighter_id,
          ),
        );
        if (!firstRed || !secondRed) continue;

        const metrics = await this.tieBreakerService.getMetricsTx(tx, {
          tournamentId: fight.tournament_id,
          nominationId: fight.nomination_id,
          competitorIds: [fight.competitor1_id, fight.competitor2_id],
          excludeFightId: fight.id,
        });
        const firstMetric = metrics.get(fight.competitor1_id);
        const secondMetric = metrics.get(fight.competitor2_id);
        if (!firstMetric || !secondMetric) continue;

        const decision = this.tieBreakerService.resolvePair(
          firstMetric,
          secondMetric,
        );
        if (decision.winnerCompetitorId === null) {
          return {
            blockId,
            groupId: null,
            fightId: fight.id,
            competitorIds: [fight.competitor1_id, fight.competitor2_id],
            scope: SCOPE_OLYMPIC_DOUBLE_RED,
          };
        }
      }
    }

    const doubleWithdrawal =
      await this.withdrawalService.getPendingDoubleWithdrawalTieTx(tx, blockId);
    if (doubleWithdrawal) {
      return {
        blockId,
        groupId: null,
        fightId: doubleWithdrawal.fightId,
        competitorIds: doubleWithdrawal.competitorIds,
        scope: SCOPE_OLYMPIC_DOUBLE_RED,
      };
    }

    return null;
  }
}
