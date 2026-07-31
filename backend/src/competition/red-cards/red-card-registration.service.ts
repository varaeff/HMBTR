import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BLOCK_GROUP, STATUS_ACTIVE } from '../competition.constants';
import { isFightResultsFixed } from '../competition.helpers';
import type { PrismaTx } from '../competition-internal.types';
import { RedCardStorageService } from './red-card-storage.service';

@Injectable()
export class RedCardRegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: RedCardStorageService,
  ) {}

  async assertNoActiveRedCompetitorsInUnfoughtBlock(blockId: number) {
    const conflicts =
      await this.getActiveRedCompetitorsInUnfoughtBlock(blockId);
    if (!conflicts.length) return;

    throw new ConflictException({
      error: 'Conflict',
      details: {
        code: 'ACTIVE_RED_CARD_COMPETITORS_REQUIRE_ROLLBACK',
        block_id: blockId,
        competitors: conflicts,
      },
    });
  }

  async getActiveRedCompetitorIdsTx(tx: PrismaTx, blockId: number) {
    if (!(await this.storageService.disciplinaryCardStorageExists())) {
      return new Set<number>();
    }

    const block = await tx.competition_blocks.findUnique({
      where: { id: blockId },
      select: { tournament_id: true, nomination_id: true },
    });
    if (!block) throw new NotFoundException('Block not found');

    const competitors = await tx.competitors.findMany({
      where: {
        tournament_id: block.tournament_id,
        nomination_id: block.nomination_id,
      },
      select: { id: true, fighter_id: true },
    });
    const checkDate = await this.storageService.getTournamentCheckDate(
      block.tournament_id,
    );
    const activeReds = await this.storageService.getActiveRedCards(
      competitors.map((competitor) => competitor.fighter_id),
      checkDate,
    );
    const activeRedFighterIds = new Set(
      activeReds.map((card) => card.fighter_id),
    );

    return new Set(
      competitors
        .filter((competitor) => activeRedFighterIds.has(competitor.fighter_id))
        .map((competitor) => competitor.id),
    );
  }

  async assertFightLifecycleEditable(fightId: number) {
    const fight = await this.prisma.fights.findUnique({
      where: { id: fightId },
      include: {
        block: {
          include: { tournament_nomination: true, round_states: true },
        },
      },
    });
    if (!fight?.block) throw new NotFoundException('Fight not found');
    if (
      fight.block.tournament_nomination.is_finished ||
      fight.block.status !== STATUS_ACTIVE
    ) {
      throw new BadRequestException('Fight is locked');
    }
    if (isFightResultsFixed({ ...fight, block: fight.block })) {
      throw new BadRequestException('Fight results and cards are fixed');
    }
  }

  excludeActiveRedCompetitors<T extends { competitorId: number }>(
    ranked: T[],
    activeRedCompetitorIds: Set<number>,
  ) {
    return ranked.filter(
      (competitor) => !activeRedCompetitorIds.has(competitor.competitorId),
    );
  }

  async removeActiveRedCompetitorsFromRegistrationTx(
    tx: PrismaTx,
    block: {
      tournament_id: number;
      nomination_id: number;
    },
  ) {
    if (!(await this.storageService.disciplinaryCardStorageExists())) return;

    const competitors = await tx.competitors.findMany({
      where: {
        tournament_id: block.tournament_id,
        nomination_id: block.nomination_id,
      },
      select: { id: true, fighter_id: true },
    });
    if (!competitors.length) return;

    const checkDate = await this.storageService.getTournamentCheckDate(
      block.tournament_id,
    );
    const activeReds = await this.storageService.getActiveRedCards(
      competitors.map((competitor) => competitor.fighter_id),
      checkDate,
    );
    const activeRedFighterIds = new Set(
      activeReds.map((card) => card.fighter_id),
    );
    const removableCompetitorIds = competitors
      .filter((competitor) => activeRedFighterIds.has(competitor.fighter_id))
      .map((competitor) => competitor.id);

    if (!removableCompetitorIds.length) return;

    await tx.competitors.deleteMany({
      where: { id: { in: removableCompetitorIds } },
    });
  }

  private async getActiveRedCompetitorsInUnfoughtBlock(blockId: number) {
    if (!(await this.storageService.disciplinaryCardStorageExists())) return [];

    const block = await this.prisma.competition_blocks.findUnique({
      where: { id: blockId },
      include: {
        fights: true,
        groups: { include: { fighters: true } },
        bracket_slots: true,
      },
    });
    if (!block) throw new NotFoundException('Block not found');
    if (block.fights.length > 0) return [];

    const competitorIds =
      block.type === BLOCK_GROUP
        ? block.groups.flatMap((group) =>
            group.fighters.map((fighter) => fighter.competitor_id),
          )
        : block.bracket_slots.map((slot) => slot.competitor_id);

    if (!competitorIds.length) return [];

    const competitors = await this.prisma.competitors.findMany({
      where: { id: { in: competitorIds } },
      include: { fighter: true },
    });
    const checkDate = await this.storageService.getTournamentCheckDate(
      block.tournament_id,
    );
    const activeReds = await this.storageService.getActiveRedCards(
      competitors.map((competitor) => competitor.fighter_id),
      checkDate,
    );
    const activeRedFighterIds = new Set(
      activeReds.map((card) => card.fighter_id),
    );

    return competitors
      .filter((competitor) => activeRedFighterIds.has(competitor.fighter_id))
      .map((competitor) => ({
        competitor_id: competitor.id,
        fighter_id: competitor.fighter_id,
        name: competitor.fighter.name,
        surname: competitor.fighter.surname,
        patronymic: competitor.fighter.patronymic,
      }));
  }
}
