import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  findTieForPlaces,
  generateCompetitionGroups,
  generateRoundRobinPairs,
  rankCompetitors,
  seedOlympicSlots,
} from './competition.logic';
import { CreateCompetitionBlockDto } from './dto/create-competition-block.dto';
import { FinishCompetitionDto } from './dto/finish-competition.dto';
import { GenerateGroupFightsDto } from './dto/generate-group-fights.dto';
import { ResolveTiesDto } from './dto/resolve-ties.dto';
import { SaveCompetitionResultsDto } from './dto/save-competition-results.dto';
import { SwapBracketSlotsDto } from './dto/swap-bracket-slots.dto';
import { UpdateCompetitionScoreDto } from './dto/update-competition-score.dto';

const BLOCK_GROUP = 'GROUP';
const BLOCK_OLYMPIC = 'OLYMPIC';
const STATUS_ACTIVE = 'ACTIVE';
const STATUS_LOCKED = 'LOCKED';
const SCOPE_GROUP = 'GROUP';
const SCOPE_FINAL = 'FINAL';

const getGroupLetter = (index: number) => String.fromCharCode(65 + index);

type PrismaTx = Omit<
  PrismaService,
  | '$connect'
  | '$disconnect'
  | '$on'
  | '$transaction'
  | '$use'
  | '$extends'
  | 'onModuleInit'
>;

@Injectable()
export class CompetitionService {
  constructor(private prisma: PrismaService) {}

  async getState(tournamentId: number, nominationId: number) {
    const tournamentNomination = await this.getTournamentNomination(
      tournamentId,
      nominationId,
    );
    const blocks = await this.prisma.competition_blocks.findMany({
      where: { tournament_nomination_id: tournamentNomination.id },
      orderBy: { stage: 'asc' },
      include: {
        groups: {
          orderBy: { name: 'asc' },
          include: {
            fighters: {
              include: {
                competitor: {
                  include: { fighter: true },
                },
              },
            },
            placements: {
              where: { scope: SCOPE_GROUP },
              orderBy: { place: 'asc' },
            },
          },
        },
        fights: {
          orderBy: [
            { fight_number: 'asc' },
            { bracket_round: 'asc' },
            { bracket_position: 'asc' },
          ],
          include: {
            competitor1: { include: { fighter: true } },
            competitor2: { include: { fighter: true } },
          },
        },
        bracket_slots: {
          orderBy: { slot_position: 'asc' },
          include: {
            competitor: {
              include: { fighter: true },
            },
          },
        },
      },
    });
    const placements = await this.prisma.competition_placements.findMany({
      where: {
        tournament_nomination_id: tournamentNomination.id,
        scope: SCOPE_FINAL,
      },
      orderBy: { place: 'asc' },
      include: {
        competitor: {
          include: { fighter: true },
        },
      },
    });
    const activeBlock = blocks.find((block) => block.status === STATUS_ACTIVE);
    const activeGroupsCount =
      activeBlock?.type === BLOCK_GROUP ? activeBlock.groups.length : 0;
    const pendingTie = activeBlock
      ? await this.getPendingTie(
          activeBlock.id,
          activeGroupsCount === 1 ? 3 : 2,
        )
      : null;

    return {
      tournamentNomination,
      blocks,
      placements,
      activeBlockId: activeBlock?.id ?? null,
      isFinished: tournamentNomination.is_finished,
      pendingTie,
    };
  }

  async createGroupBlock(dto: CreateCompetitionBlockDto) {
    await this.prisma.$transaction(async (tx) => {
      const tournamentNomination = await this.getTournamentNominationTx(
        tx,
        dto.tournament_id,
        dto.nomination_id,
      );
      if (tournamentNomination.is_finished) {
        throw new BadRequestException('Nomination is finished');
      }

      const activeBlock = await this.getActiveBlockTx(
        tx,
        tournamentNomination.id,
      );
      const competitors = activeBlock
        ? await this.getAdvancingCompetitorsTx(tx, activeBlock.id)
        : await this.getRegisteredCompetitorsTx(
            tx,
            dto.tournament_id,
            dto.nomination_id,
          );

      if (competitors.length < 3) {
        throw new BadRequestException('At least 3 fighters are required');
      }

      if (activeBlock) {
        await tx.competition_blocks.update({
          where: { id: activeBlock.id },
          data: { status: STATUS_LOCKED },
        });
      }

      const nextStage = await this.getNextStageTx(tx, tournamentNomination.id);
      const block = await tx.competition_blocks.create({
        data: {
          tournament_nomination_id: tournamentNomination.id,
          tournament_id: dto.tournament_id,
          nomination_id: dto.nomination_id,
          type: BLOCK_GROUP,
          stage: nextStage,
          status: STATUS_ACTIVE,
        },
      });

      const groupStartIndex = await this.getGroupStartIndexTx(
        tx,
        tournamentNomination.id,
        nextStage,
      );
      await this.createDraftGroupsTx(
        tx,
        block.id,
        nextStage,
        dto,
        competitors,
        groupStartIndex,
      );
      await tx.tournament_nominations.update({
        where: { id: tournamentNomination.id },
        data: { stage: nextStage },
      });
    });

    return this.getState(dto.tournament_id, dto.nomination_id);
  }

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

    await this.prisma.$transaction(async (tx) => {
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

    return this.getState(block.tournament_id, block.nomination_id);
  }

  async createOlympicBlock(dto: CreateCompetitionBlockDto) {
    await this.prisma.$transaction(async (tx) => {
      const tournamentNomination = await this.getTournamentNominationTx(
        tx,
        dto.tournament_id,
        dto.nomination_id,
      );
      if (tournamentNomination.is_finished) {
        throw new BadRequestException('Nomination is finished');
      }

      const activeBlock = await this.getActiveBlockTx(
        tx,
        tournamentNomination.id,
      );
      const competitors = activeBlock
        ? await this.getAdvancingCompetitorsTx(tx, activeBlock.id)
        : await this.getRegisteredCompetitorsTx(
            tx,
            dto.tournament_id,
            dto.nomination_id,
          );

      if (![4, 8, 16].includes(competitors.length)) {
        throw new BadRequestException(
          'Olympic bracket requires 4, 8 or 16 fighters',
        );
      }

      if (activeBlock) {
        await tx.competition_blocks.update({
          where: { id: activeBlock.id },
          data: { status: STATUS_LOCKED },
        });
      }

      const nextStage = await this.getNextStageTx(tx, tournamentNomination.id);
      const block = await tx.competition_blocks.create({
        data: {
          tournament_nomination_id: tournamentNomination.id,
          tournament_id: dto.tournament_id,
          nomination_id: dto.nomination_id,
          type: BLOCK_OLYMPIC,
          stage: nextStage,
          status: STATUS_ACTIVE,
        },
      });

      const seeded = seedOlympicSlots(competitors);
      await Promise.all(
        seeded.map((competitor, index) =>
          tx.bracket_slots.create({
            data: {
              block_id: block.id,
              competitor_id: competitor.id,
              seed_position: index + 1,
              slot_position: index + 1,
            },
          }),
        ),
      );
      await this.recreateInitialBracketFightsTx(
        tx,
        block.id,
        dto.tournament_id,
        dto.nomination_id,
        nextStage,
      );
      await tx.tournament_nominations.update({
        where: { id: tournamentNomination.id },
        data: { stage: nextStage },
      });
    });

    return this.getState(dto.tournament_id, dto.nomination_id);
  }

  async updateScore(dto: UpdateCompetitionScoreDto) {
    const fight = await this.prisma.fights.findUnique({
      where: { id: dto.fight_id },
      include: { block: { include: { tournament_nomination: true } } },
    });
    if (!fight) throw new NotFoundException('Fight not found');
    if (!fight.block)
      throw new BadRequestException('Fight is not part of a competition block');
    if (
      fight.block.status !== STATUS_ACTIVE ||
      fight.block.tournament_nomination.is_finished
    ) {
      throw new BadRequestException('Block is locked');
    }

    const isEmpty = dto.competitor1_score === 0 && dto.competitor2_score === 0;
    if (!isEmpty && dto.competitor1_score === dto.competitor2_score) {
      throw new BadRequestException('Draw scores are not allowed');
    }

    const winnerId = isEmpty
      ? null
      : dto.competitor1_score > dto.competitor2_score
        ? fight.competitor1_id
        : fight.competitor2_id;

    await this.prisma.fights.update({
      where: { id: dto.fight_id },
      data: {
        competitor1_score: dto.competitor1_score,
        competitor2_score: dto.competitor2_score,
        winner_id: winnerId,
        is_finished: !isEmpty,
      },
    });

    if (fight.block.type === BLOCK_OLYMPIC && winnerId) {
      await this.progressOlympicBlock(fight.block_id!);
    }

    return this.getState(fight.tournament_id, fight.nomination_id);
  }

  async saveResults(dto: SaveCompetitionResultsDto) {
    const block = await this.prisma.competition_blocks.findUnique({
      where: { id: dto.block_id },
      include: { fights: true, tournament_nomination: true },
    });
    if (!block) throw new NotFoundException('Block not found');
    if (
      block.status !== STATUS_ACTIVE ||
      block.tournament_nomination.is_finished
    ) {
      throw new BadRequestException('Block is locked');
    }
    if (!dto.fights.length) {
      throw new BadRequestException('No fight results to save');
    }

    const blockFightIds = new Set(block.fights.map((fight) => fight.id));
    const incomingFightIds = dto.fights.map((fight) => fight.fight_id);
    const incomingSet = new Set(incomingFightIds);

    if (incomingSet.size !== incomingFightIds.length) {
      throw new BadRequestException('Fight results contain duplicates');
    }
    if (incomingFightIds.some((fightId) => !blockFightIds.has(fightId))) {
      throw new BadRequestException('Fight does not belong to the block');
    }

    const hasInvalidScore = dto.fights.some((fight) => {
      const isEmpty =
        fight.competitor1_score === 0 && fight.competitor2_score === 0;
      const isDraw = fight.competitor1_score === fight.competitor2_score;

      return isEmpty || isDraw;
    });
    if (hasInvalidScore) {
      throw new BadRequestException('Every saved fight must have a winner');
    }

    await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        dto.fights.map(async (result) => {
          const fight = block.fights.find(
            (item) => item.id === result.fight_id,
          );
          if (!fight)
            throw new BadRequestException('Fight does not belong to the block');

          const winnerId =
            result.competitor1_score > result.competitor2_score
              ? fight.competitor1_id
              : fight.competitor2_id;

          await tx.fights.update({
            where: { id: result.fight_id },
            data: {
              competitor1_score: result.competitor1_score,
              competitor2_score: result.competitor2_score,
              winner_id: winnerId,
              is_finished: true,
            },
          });
        }),
      );
    });

    if (block.type === BLOCK_OLYMPIC) {
      await this.progressOlympicBlock(block.id);
    }

    return this.getState(block.tournament_id, block.nomination_id);
  }

  async swapBracketSlots(dto: SwapBracketSlotsDto) {
    const block = await this.prisma.competition_blocks.findUnique({
      where: { id: dto.block_id },
      include: { fights: true },
    });
    if (!block) throw new NotFoundException('Block not found');
    if (block.type !== BLOCK_OLYMPIC || block.status !== STATUS_ACTIVE) {
      throw new BadRequestException('Bracket is locked');
    }
    if (block.fights.some((fight) => fight.is_finished)) {
      throw new BadRequestException(
        'Bracket slots are locked after the first score',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const source = await tx.bracket_slots.findFirst({
        where: { block_id: dto.block_id, slot_position: dto.source_position },
      });
      const target = await tx.bracket_slots.findFirst({
        where: { block_id: dto.block_id, slot_position: dto.target_position },
      });
      if (!source || !target)
        throw new NotFoundException('Bracket slot not found');

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
      await tx.fights.deleteMany({ where: { block_id: dto.block_id } });
      await this.recreateInitialBracketFightsTx(
        tx,
        block.id,
        block.tournament_id,
        block.nomination_id,
        block.stage,
      );
    });

    return this.getState(block.tournament_id, block.nomination_id);
  }

  async resolveTies(dto: ResolveTiesDto) {
    const tournamentNomination = await this.getTournamentNomination(
      dto.tournament_id,
      dto.nomination_id,
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.competition_placements.deleteMany({
        where: {
          tournament_nomination_id: tournamentNomination.id,
          scope: SCOPE_GROUP,
          group_id: dto.group_id,
        },
      });
      await Promise.all(
        dto.ordered_competitor_ids.map((competitorId, index) =>
          tx.competition_placements.create({
            data: {
              tournament_nomination_id: tournamentNomination.id,
              group_id: dto.group_id,
              competitor_id: competitorId,
              scope: SCOPE_GROUP,
              place: index + 1,
            },
          }),
        ),
      );
    });

    return this.getState(dto.tournament_id, dto.nomination_id);
  }

  async finish(dto: FinishCompetitionDto) {
    await this.prisma.$transaction(async (tx) => {
      const tournamentNomination = await this.getTournamentNominationTx(
        tx,
        dto.tournament_id,
        dto.nomination_id,
      );
      const activeBlock = await this.getActiveBlockTx(
        tx,
        tournamentNomination.id,
      );
      if (!activeBlock) throw new BadRequestException('No active block');
      if (activeBlock.type !== BLOCK_GROUP) {
        throw new BadRequestException('Olympic blocks finish automatically');
      }

      const groups = await tx.groups.findMany({
        where: { block_id: activeBlock.id },
      });
      if (groups.length !== 1) {
        throw new BadRequestException(
          'Subgroup mode can finish only from a single group',
        );
      }
      const rankings = await this.getGroupRankingsTx(
        tx,
        activeBlock.id,
        groups[0].id,
      );
      const ranked = rankCompetitors(rankings.stats, rankings.manualOrder);
      const unresolvedTie = findTieForPlaces(ranked, 3).filter(
        (competitorId) => !rankings.manualOrder.includes(competitorId),
      );
      if (unresolvedTie.length) {
        throw new BadRequestException('Resolve ranking ties before finishing');
      }

      await this.saveFinalPlacementsTx(
        tx,
        tournamentNomination.id,
        activeBlock.id,
        ranked.slice(0, 3),
      );
      await tx.competition_blocks.update({
        where: { id: activeBlock.id },
        data: { status: STATUS_LOCKED },
      });
      await tx.tournament_nominations.update({
        where: { id: tournamentNomination.id },
        data: { is_finished: true, is_open: false },
      });
    });

    return this.getState(dto.tournament_id, dto.nomination_id);
  }

  private async getTournamentNomination(
    tournamentId: number,
    nominationId: number,
  ) {
    const tournamentNomination =
      await this.prisma.tournament_nominations.findFirst({
        where: { tournament_id: tournamentId, nomination_id: nominationId },
      });
    if (!tournamentNomination)
      throw new NotFoundException('Tournament nomination not found');
    return tournamentNomination;
  }

  private async getTournamentNominationTx(
    tx: PrismaTx,
    tournamentId: number,
    nominationId: number,
  ) {
    const tournamentNomination = await tx.tournament_nominations.findFirst({
      where: { tournament_id: tournamentId, nomination_id: nominationId },
    });
    if (!tournamentNomination)
      throw new NotFoundException('Tournament nomination not found');
    return tournamentNomination;
  }

  private async getActiveBlockTx(tx: PrismaTx, tournamentNominationId: number) {
    return tx.competition_blocks.findFirst({
      where: {
        tournament_nomination_id: tournamentNominationId,
        status: STATUS_ACTIVE,
      },
      orderBy: { stage: 'desc' },
    });
  }

  private async getNextStageTx(tx: PrismaTx, tournamentNominationId: number) {
    const lastBlock = await tx.competition_blocks.findFirst({
      where: { tournament_nomination_id: tournamentNominationId },
      orderBy: { stage: 'desc' },
    });
    return (lastBlock?.stage ?? 0) + 1;
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

  private getRegisteredCompetitorsTx(
    tx: PrismaTx,
    tournamentId: number,
    nominationId: number,
  ) {
    return tx.competitors.findMany({
      where: { tournament_id: tournamentId, nomination_id: nominationId },
      orderBy: { id: 'asc' },
      include: { fighter: true },
    });
  }

  private async createDraftGroupsTx(
    tx: PrismaTx,
    blockId: number,
    stage: number,
    dto: CreateCompetitionBlockDto,
    competitors: Awaited<
      ReturnType<CompetitionService['getRegisteredCompetitorsTx']>
    >,
    groupStartIndex: number,
  ) {
    const groups = generateCompetitionGroups(competitors, groupStartIndex);

    for (const group of groups) {
      const createdGroup = await tx.groups.create({
        data: {
          tournament_id: dto.tournament_id,
          nomination_id: dto.nomination_id,
          block_id: blockId,
          name: group.name,
          stage,
        },
      });

      await Promise.all(
        group.competitors.map((competitor) =>
          tx.group_competitors.create({
            data: {
              group_id: createdGroup.id,
              competitor_id: competitor.id,
            },
          }),
        ),
      );
    }
  }

  private async createGroupFightsTx(
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
            },
          });
        }
      }
    }
  }

  private async getAdvancingCompetitorsTx(tx: PrismaTx, blockId: number) {
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
    const pendingTie = await this.getPendingTieTx(tx, blockId, 2);
    if (pendingTie) {
      throw new BadRequestException(
        'Resolve ranking ties before creating the next block',
      );
    }

    const advancerIds: number[] = [];
    for (const group of groups) {
      const rankings = await this.getGroupRankingsTx(tx, blockId, group.id);
      const ranked = rankCompetitors(rankings.stats, rankings.manualOrder);
      advancerIds.push(
        ...ranked.slice(0, 2).map((competitor) => competitor.competitorId),
      );
    }

    return tx.competitors.findMany({
      where: { id: { in: advancerIds } },
      include: { fighter: true },
      orderBy: { id: 'asc' },
    });
  }

  private async getGroupRankingsTx(
    tx: PrismaTx,
    blockId: number,
    groupId: number,
  ) {
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
    });

    if (fights.some((fight) => !fight.is_finished)) {
      throw new BadRequestException('All group fights must be completed');
    }

    for (const fight of fights) {
      const s1 = statsMap.get(fight.competitor1_id);
      const s2 = statsMap.get(fight.competitor2_id);
      if (s1) {
        s1.diff += fight.competitor1_score - fight.competitor2_score;
        if (fight.competitor1_score > fight.competitor2_score) s1.wins++;
      }
      if (s2) {
        s2.diff += fight.competitor2_score - fight.competitor1_score;
        if (fight.competitor2_score > fight.competitor1_score) s2.wins++;
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

  private async getPendingTie(blockId: number, places: number) {
    return this.getPendingTieTx(this.prisma, blockId, places);
  }

  private async getPendingTieTx(tx: PrismaTx, blockId: number, places: number) {
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

    for (const group of groups) {
      try {
        const rankings = await this.getGroupRankingsTx(tx, blockId, group.id);
        const ranked = rankCompetitors(rankings.stats, rankings.manualOrder);
        const unresolved = findTieForPlaces(ranked, places).filter(
          (competitorId) => !rankings.manualOrder.includes(competitorId),
        );
        if (unresolved.length) {
          return {
            blockId,
            groupId: group.id,
            competitorIds: unresolved,
          };
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  private async recreateInitialBracketFightsTx(
    tx: PrismaTx,
    blockId: number,
    tournamentId: number,
    nominationId: number,
    stage: number,
  ) {
    const slots = await tx.bracket_slots.findMany({
      where: { block_id: blockId },
      orderBy: { slot_position: 'asc' },
    });
    let fightNumber = await this.getNextFightNumberTx(
      tx,
      tournamentId,
      nominationId,
    );

    for (let i = 0; i < slots.length; i += 2) {
      await tx.fights.create({
        data: {
          tournament_id: tournamentId,
          nomination_id: nominationId,
          block_id: blockId,
          competitor1_id: slots[i].competitor_id,
          competitor2_id: slots[i + 1].competitor_id,
          stage,
          fight_number: fightNumber++,
          bracket_round: 1,
          bracket_position: i / 2 + 1,
        },
      });
    }
  }

  async progressOlympicBlock(blockId: number) {
    await this.prisma.$transaction(async (tx) => {
      const block = await tx.competition_blocks.findUnique({
        where: { id: blockId },
        include: { bracket_slots: true },
      });
      if (!block) throw new NotFoundException('Block not found');

      const slotCount = block.bracket_slots.length;
      const mainRounds = Math.log2(slotCount);
      let fightNumber = await this.getNextFightNumberTx(
        tx,
        block.tournament_id,
        block.nomination_id,
      );

      for (let round = 1; round < mainRounds; round++) {
        const fights = await tx.fights.findMany({
          where: { block_id: blockId, bracket_round: round, is_bronze: false },
          orderBy: { bracket_position: 'asc' },
        });
        if (
          !fights.length ||
          fights.some((fight) => !fight.is_finished || !fight.winner_id)
        )
          break;

        const nextRoundExists = await tx.fights.count({
          where: {
            block_id: blockId,
            bracket_round: round + 1,
            is_bronze: false,
          },
        });
        if (!nextRoundExists) {
          for (let index = 0; index < fights.length; index += 2) {
            await tx.fights.create({
              data: {
                tournament_id: block.tournament_id,
                nomination_id: block.nomination_id,
                block_id: blockId,
                competitor1_id: fights[index].winner_id!,
                competitor2_id: fights[index + 1].winner_id!,
                stage: block.stage,
                fight_number: fightNumber++,
                bracket_round: round + 1,
                bracket_position: index / 2 + 1,
              },
            });
          }
        }
      }

      const semifinalRound = mainRounds - 1;
      const semifinals = await tx.fights.findMany({
        where: {
          block_id: blockId,
          bracket_round: semifinalRound,
          is_bronze: false,
        },
        orderBy: { bracket_position: 'asc' },
      });
      const bronzeExists = await tx.fights.findFirst({
        where: { block_id: blockId, is_bronze: true },
      });
      if (
        semifinals.length === 2 &&
        !bronzeExists &&
        semifinals.every((fight) => fight.is_finished && fight.winner_id)
      ) {
        const losers = semifinals.map((fight) =>
          fight.winner_id === fight.competitor1_id
            ? fight.competitor2_id
            : fight.competitor1_id,
        );
        await tx.fights.create({
          data: {
            tournament_id: block.tournament_id,
            nomination_id: block.nomination_id,
            block_id: blockId,
            competitor1_id: losers[0],
            competitor2_id: losers[1],
            stage: block.stage,
            fight_number: fightNumber++,
            bracket_round: mainRounds + 1,
            bracket_position: 1,
            is_bronze: true,
          },
        });
      }

      const finalFight = await tx.fights.findFirst({
        where: {
          block_id: blockId,
          bracket_round: mainRounds,
          is_bronze: false,
        },
      });
      const bronzeFight = await tx.fights.findFirst({
        where: { block_id: blockId, is_bronze: true },
      });
      if (
        finalFight?.is_finished &&
        finalFight.winner_id &&
        bronzeFight?.is_finished &&
        bronzeFight.winner_id
      ) {
        const secondPlace =
          finalFight.winner_id === finalFight.competitor1_id
            ? finalFight.competitor2_id
            : finalFight.competitor1_id;
        await this.saveFinalPlacementsTx(
          tx,
          block.tournament_nomination_id,
          blockId,
          [
            { competitorId: finalFight.winner_id },
            { competitorId: secondPlace },
            { competitorId: bronzeFight.winner_id },
          ],
        );
        await tx.competition_blocks.update({
          where: { id: blockId },
          data: { status: STATUS_LOCKED },
        });
        await tx.tournament_nominations.update({
          where: { id: block.tournament_nomination_id },
          data: { is_finished: true, is_open: false },
        });
      }
    });
  }

  private async saveFinalPlacementsTx(
    tx: PrismaTx,
    tournamentNominationId: number,
    blockId: number,
    ranked: Array<{ competitorId: number }>,
  ) {
    await tx.competition_placements.deleteMany({
      where: {
        tournament_nomination_id: tournamentNominationId,
        scope: SCOPE_FINAL,
      },
    });
    await Promise.all(
      ranked.slice(0, 3).map((competitor, index) =>
        tx.competition_placements.create({
          data: {
            tournament_nomination_id: tournamentNominationId,
            block_id: blockId,
            competitor_id: competitor.competitorId,
            scope: SCOPE_FINAL,
            place: index + 1,
          },
        }),
      ),
    );
  }
}
