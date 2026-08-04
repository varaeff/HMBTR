import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  generateRoundRobinPairs,
  OLYMPIC_BRACKET_SIZES,
} from '../competition.logic';
import {
  BLOCK_GROUP,
  BLOCK_OLYMPIC,
  LIFECYCLE_FIGHTS_EDITABLE,
  LIFECYCLE_FORMATION_EDITABLE,
  STATUS_ACTIVE,
} from '../competition.constants';
import { assertSingleTransition, getGroupLetter } from '../competition.helpers';
import type { PrismaTx } from '../competition-internal.types';
import { CompetitionRedCardService } from '../competition-red-card.service';
import { GenerateGroupFightsDto } from '../dto/generate-group-fights.dto';
import { GenerateOlympicFightsDto } from '../dto/generate-olympic-fights.dto';
import { SwapBracketSlotsDto } from '../dto/swap-bracket-slots.dto';
import { CompetitionOlympicService } from '../olympic/competition-olympic.service';
import { CompetitionStateReader } from '../state/competition-state.reader';

@Injectable()
export class CompetitionFightService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateReader: CompetitionStateReader,
    private readonly olympicService: CompetitionOlympicService,
    private readonly redCardService: CompetitionRedCardService,
  ) {}

  async generateGroupFights(dto: GenerateGroupFightsDto) {
    const block = await this.prisma.competition_blocks.findUnique({
      where: { id: dto.block_id },
      include: {
        tournament_nomination: true,
        groups: {
          include: {
            fighters: true,
          },
        },
        fights: true,
      },
    });
    if (!block) throw new NotFoundException('Block not found');
    if (block.type !== BLOCK_GROUP) {
      throw new BadRequestException(
        'Only group blocks can generate group fights',
      );
    }
    if (
      block.status !== STATUS_ACTIVE ||
      block.tournament_nomination.is_finished
    ) {
      throw new BadRequestException('Block is locked');
    }
    if (block.lifecycle_state !== LIFECYCLE_FORMATION_EDITABLE) {
      throw new BadRequestException('Group formation is fixed');
    }
    if (block.fights.length > 0) {
      throw new BadRequestException('Fights are already generated');
    }
    if (
      !dto.groups.length ||
      dto.groups.some((group) => group.competitor_ids.length < 3)
    ) {
      throw new BadRequestException(
        'Every group must contain at least 3 fighters',
      );
    }

    const existingCompetitorIds = block.groups.flatMap((group) =>
      group.fighters.map((fighter) => fighter.competitor_id),
    );
    const incomingCompetitorIds = dto.groups.flatMap(
      (group) => group.competitor_ids,
    );
    const incomingSet = new Set(incomingCompetitorIds);
    const existingSet = new Set(existingCompetitorIds);
    if (
      incomingSet.size !== incomingCompetitorIds.length ||
      incomingSet.size !== existingSet.size ||
      [...incomingSet].some((competitorId) => !existingSet.has(competitorId))
    ) {
      throw new BadRequestException(
        'Groups must contain the same fighters exactly once',
      );
    }
    await this.redCardService.assertNoActiveRedCompetitorsInUnfoughtBlock(
      block.id,
    );

    await this.prisma.$transaction(async (tx) => {
      const transition = await tx.competition_blocks.updateMany({
        where: {
          id: block.id,
          lifecycle_state: LIFECYCLE_FORMATION_EDITABLE,
          status: STATUS_ACTIVE,
        },
        data: { lifecycle_state: LIFECYCLE_FIGHTS_EDITABLE },
      });
      assertSingleTransition(transition.count);
      await tx.groups.deleteMany({ where: { block_id: block.id } });

      const createdGroups: Array<{
        id: number;
        competitors: Array<{ id: number }>;
      }> = [];
      const groupStartIndex = await this.getGroupStartIndexTx(
        tx,
        block.tournament_nomination_id,
        block.stage,
      );

      for (const [index, group] of dto.groups.entries()) {
        const createdGroup = await tx.groups.create({
          data: {
            tournament_id: block.tournament_id,
            nomination_id: block.nomination_id,
            block_id: block.id,
            name: getGroupLetter(groupStartIndex + index),
            stage: block.stage,
          },
        });

        createdGroups.push({
          id: createdGroup.id,
          competitors: group.competitor_ids.map((id) => ({ id })),
        });

        await Promise.all(
          group.competitor_ids.map((competitorId) =>
            tx.group_competitors.create({
              data: {
                group_id: createdGroup.id,
                competitor_id: competitorId,
              },
            }),
          ),
        );
      }

      await this.createGroupFightsTx(
        tx,
        block.id,
        block.stage,
        block.tournament_id,
        block.nomination_id,
        createdGroups,
      );
    });

    await this.redCardService.applyRedCardForfeits(block.tournament_id);

    return this.stateReader.getState(block.tournament_id, block.nomination_id);
  }

  async generateOlympicFights(dto: GenerateOlympicFightsDto) {
    const block = await this.prisma.competition_blocks.findUnique({
      where: { id: dto.block_id },
      include: {
        tournament_nomination: true,
        fights: true,
        bracket_slots: true,
        round_states: true,
      },
    });
    if (!block) throw new NotFoundException('Block not found');
    if (block.type !== BLOCK_OLYMPIC) {
      throw new BadRequestException(
        'Only Olympic blocks can generate Olympic fights',
      );
    }
    if (
      block.status !== STATUS_ACTIVE ||
      block.tournament_nomination.is_finished
    ) {
      throw new BadRequestException('Block is locked');
    }
    if (
      !OLYMPIC_BRACKET_SIZES.some((size) => size === block.bracket_slots.length)
    ) {
      throw new BadRequestException(
        'Olympic bracket requires 4, 8 or 16 fighters',
      );
    }
    const pendingPairs = this.olympicService.getPendingOlympicPairs(
      block.bracket_slots,
      block.fights,
    );

    if (!pendingPairs) {
      throw new BadRequestException('No Olympic pairs to fix');
    }
    await this.redCardService.assertNoActiveRedCompetitorsInUnfoughtBlock(
      block.id,
    );
    const pendingRoundState = block.round_states.find(
      (state) => state.round === pendingPairs.round,
    );
    if (!pendingRoundState || pendingRoundState.pairs_fixed) {
      throw new BadRequestException('Olympic pairs cannot be fixed now');
    }

    await this.prisma.$transaction(async (tx) => {
      const transition = await tx.competition_round_states.updateMany({
        where: {
          id: pendingRoundState.id,
          pairs_fixed: false,
          results_fixed: false,
        },
        data: { pairs_fixed: true },
      });
      assertSingleTransition(transition.count);
      await this.olympicService.createBracketFightsFromSlotsTx(tx, {
        blockId: block.id,
        tournamentId: block.tournament_id,
        nominationId: block.nomination_id,
        stage: block.stage,
        round: pendingPairs.round,
        slots: pendingPairs.slots,
      });
    });

    await this.redCardService.applyRedCardForfeits(block.tournament_id);

    return this.stateReader.getState(block.tournament_id, block.nomination_id);
  }

  async swapBracketSlots(dto: SwapBracketSlotsDto) {
    const block = await this.prisma.competition_blocks.findUnique({
      where: { id: dto.block_id },
      include: { fights: true, bracket_slots: true, round_states: true },
    });
    if (!block) throw new NotFoundException('Block not found');
    if (block.type !== BLOCK_OLYMPIC || block.status !== STATUS_ACTIVE) {
      throw new BadRequestException('Bracket is locked');
    }
    const pendingPairs = this.olympicService.getPendingOlympicPairs(
      block.bracket_slots,
      block.fights,
    );
    if (!pendingPairs) {
      throw new BadRequestException('Bracket slots are locked');
    }
    const pendingRoundState = block.round_states.find(
      (state) => state.round === pendingPairs.round,
    );
    if (!pendingRoundState || pendingRoundState.pairs_fixed) {
      throw new BadRequestException('Bracket slots are locked');
    }
    const pendingPositions = new Set(
      pendingPairs.slots.map((slot) => slot.slot_position),
    );
    if (
      !pendingPositions.has(dto.source_position) ||
      !pendingPositions.has(dto.target_position)
    ) {
      throw new BadRequestException('Only pending pairs can be changed');
    }

    await this.prisma.$transaction(async (tx) => {
      const source = await tx.bracket_slots.findFirst({
        where: { block_id: dto.block_id, slot_position: dto.source_position },
      });
      const target = await tx.bracket_slots.findFirst({
        where: { block_id: dto.block_id, slot_position: dto.target_position },
      });
      if (!source || !target) {
        throw new NotFoundException('Bracket slot not found');
      }

      await tx.bracket_slots.update({
        where: { id: source.id },
        data: { slot_position: -1 },
      });
      await tx.bracket_slots.update({
        where: { id: target.id },
        data: { slot_position: dto.source_position },
      });
      await tx.bracket_slots.update({
        where: { id: source.id },
        data: { slot_position: dto.target_position },
      });
    });

    return this.stateReader.getState(block.tournament_id, block.nomination_id);
  }

  async createGroupFightsTx(
    tx: PrismaTx,
    blockId: number,
    stage: number,
    tournamentId: number,
    nominationId: number,
    createdGroups: Array<{
      id: number;
      competitors: Array<{ id: number }>;
    }>,
  ) {
    const nomination = await tx.nominations.findUnique({
      where: { id: nominationId },
      select: { rounds: true, round_win: true },
    });
    if (!nomination) throw new NotFoundException('Nomination not found');
    let fightNumber = await this.getNextFightNumberTx(
      tx,
      tournamentId,
      nominationId,
    );
    for (let i = 0; i < createdGroups.length; i += 2) {
      const firstSchedule = generateRoundRobinPairs(
        createdGroups[i].competitors,
      );
      const secondSchedule = createdGroups[i + 1]
        ? generateRoundRobinPairs(createdGroups[i + 1].competitors)
        : [];
      const maxLength = Math.max(firstSchedule.length, secondSchedule.length);

      for (let round = 0; round < maxLength; round++) {
        if (firstSchedule[round]) {
          const [c1, c2] = firstSchedule[round];
          await tx.fights.create({
            data: {
              tournament_id: tournamentId,
              nomination_id: nominationId,
              block_id: blockId,
              group_id: createdGroups[i].id,
              competitor1_id: c1.id,
              competitor2_id: c2.id,
              stage,
              fight_number: fightNumber++,
              rounds: nomination.rounds,
              round_win: nomination.round_win,
            },
          });
        }

        if (secondSchedule[round]) {
          const [c1, c2] = secondSchedule[round];
          await tx.fights.create({
            data: {
              tournament_id: tournamentId,
              nomination_id: nominationId,
              block_id: blockId,
              group_id: createdGroups[i + 1].id,
              competitor1_id: c1.id,
              competitor2_id: c2.id,
              stage,
              fight_number: fightNumber++,
              rounds: nomination.rounds,
              round_win: nomination.round_win,
            },
          });
        }
      }
    }
  }

  async renumberNominationFights(tournamentId: number, nominationId: number) {
    const fights = await this.prisma.fights.findMany({
      where: { tournament_id: tournamentId, nomination_id: nominationId },
      orderBy: [
        { stage: 'asc' },
        { fight_number: 'asc' },
        { bracket_round: 'asc' },
        { bracket_position: 'asc' },
      ],
    });
    for (const [index, fight] of fights.entries()) {
      await this.prisma.fights.update({
        where: { id: fight.id },
        data: { fight_number: index + 1 },
      });
    }
  }

  private async getGroupStartIndexTx(
    tx: PrismaTx,
    tournamentNominationId: number,
    stage: number,
  ) {
    return tx.groups.count({
      where: {
        block: {
          tournament_nomination_id: tournamentNominationId,
          type: BLOCK_GROUP,
          stage: { lt: stage },
        },
      },
    });
  }

  private async getNextFightNumberTx(
    tx: PrismaTx,
    tournamentId: number,
    nominationId: number,
  ) {
    const result = await tx.fights.aggregate({
      where: { tournament_id: tournamentId, nomination_id: nominationId },
      _max: { fight_number: true },
    });

    return (result._max.fight_number ?? 0) + 1;
  }
}
