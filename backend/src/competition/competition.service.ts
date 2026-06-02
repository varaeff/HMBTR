import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RatingsService } from '../ratings/ratings.service';
import {
  findThirdPlaceAdvancementTie,
  findTieForPlaces,
  generateCompetitionGroups,
  generateRoundRobinPairs,
  getOlympicThirdPlaceShortfall,
  OLYMPIC_BRACKET_SIZES,
  rankCompetitors,
  seedOlympicSlots,
  seedOlympicSlotsWithThirdPlacePairing,
  selectOlympicAdvancers,
} from './competition.logic';
import type { RankedCompetitor, RankedGroup } from './competition.logic';
import { CreateCompetitionBlockDto } from './dto/create-competition-block.dto';
import { FinishCompetitionDto } from './dto/finish-competition.dto';
import { GenerateGroupFightsDto } from './dto/generate-group-fights.dto';
import { GenerateOlympicFightsDto } from './dto/generate-olympic-fights.dto';
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
const SCOPE_OLYMPIC_THIRD = 'OLYMPIC_THIRD';

export type PendingTieScope = typeof SCOPE_GROUP | typeof SCOPE_OLYMPIC_THIRD;

export interface PendingTieResult {
  blockId: number;
  groupId: number | null;
  competitorIds: number[];
  scope: PendingTieScope;
}

interface GroupRankings {
  stats: RankedCompetitor[];
  manualOrder: number[];
}

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

interface ActiveRedCard {
  id: number;
  fighter_id: number;
  received_at: Date;
}

@Injectable()
export class CompetitionService {
  constructor(
    private prisma: PrismaService,
    private ratingsService: RatingsService,
  ) {}

  async getState(tournamentId: number, nominationId: number) {
    const tournamentNomination = await this.getTournamentNomination(
      tournamentId,
      nominationId,
    );
    await this.normalizeBronzeFinalFightNumbers(tournamentNomination.id);
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
    let pendingTie = activeBlock
      ? await this.getPendingTie(
          activeBlock.id,
          activeGroupsCount === 1 ? 3 : 2,
        )
      : null;
    if (
      !pendingTie &&
      activeBlock?.type === BLOCK_GROUP &&
      activeGroupsCount > 1
    ) {
      pendingTie = await this.getPendingOlympicThirdPlaceTieTx(
        this.prisma,
        activeBlock.id,
      );
    }

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

    await this.applyRedCardForfeits(block.tournament_id);

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
        ? await this.getAdvancingCompetitorsTx(
            tx,
            activeBlock.id,
            Boolean(dto.include_third_places),
          )
        : await this.getRegisteredCompetitorsTx(
            tx,
            dto.tournament_id,
            dto.nomination_id,
          );

      if (!OLYMPIC_BRACKET_SIZES.some((size) => size === competitors.length)) {
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

      const seeded = dto.include_third_places
        ? seedOlympicSlotsWithThirdPlacePairing(competitors)
        : seedOlympicSlots(competitors);
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
      await tx.tournament_nominations.update({
        where: { id: tournamentNomination.id },
        data: { stage: nextStage },
      });
    });

    return this.getState(dto.tournament_id, dto.nomination_id);
  }

  async generateOlympicFights(dto: GenerateOlympicFightsDto) {
    const block = await this.prisma.competition_blocks.findUnique({
      where: { id: dto.block_id },
      include: {
        tournament_nomination: true,
        fights: true,
        bracket_slots: true,
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
    const pendingPairs = this.getPendingOlympicPairs(
      block.bracket_slots,
      block.fights,
    );

    if (!pendingPairs) {
      throw new BadRequestException('No Olympic pairs to fix');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.createBracketFightsFromSlotsTx(tx, {
        blockId: block.id,
        tournamentId: block.tournament_id,
        nominationId: block.nomination_id,
        stage: block.stage,
        round: pendingPairs.round,
        slots: pendingPairs.slots,
      });
    });

    await this.applyRedCardForfeits(block.tournament_id);

    return this.getState(block.tournament_id, block.nomination_id);
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
      include: { fights: true, bracket_slots: true },
    });
    if (!block) throw new NotFoundException('Block not found');
    if (block.type !== BLOCK_OLYMPIC || block.status !== STATUS_ACTIVE) {
      throw new BadRequestException('Bracket is locked');
    }
    const pendingPairs = this.getPendingOlympicPairs(
      block.bracket_slots,
      block.fights,
    );
    if (!pendingPairs) {
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
    });

    return this.getState(block.tournament_id, block.nomination_id);
  }

  async applyRedCardForfeits(tournamentId: number) {
    if (!(await this.disciplinaryCardStorageExists())) return;

    const checkDate = await this.getTournamentCheckDate(tournamentId);
    const fights = await this.prisma.fights.findMany({
      where: {
        tournament_id: tournamentId,
        is_finished: false,
      },
      include: {
        block: true,
        competitor1: true,
        competitor2: true,
      },
    });

    if (!fights.length) return;

    const fighterIds = [
      ...new Set(
        fights.flatMap((fight) => [
          fight.competitor1.fighter_id,
          fight.competitor2.fighter_id,
        ]),
      ),
    ];
    const activeReds = await this.getActiveRedCards(fighterIds, checkDate);
    const activeRedByFighter = new Map(
      activeReds.map((card) => [card.fighter_id, card]),
    );
    const olympicBlockIds = new Set<number>();

    for (const fight of fights) {
      const firstRed = activeRedByFighter.get(fight.competitor1.fighter_id);
      const secondRed = activeRedByFighter.get(fight.competitor2.fighter_id);
      const losingCompetitorId = this.getRedCardLosingCompetitorId({
        firstCompetitorId: fight.competitor1_id,
        secondCompetitorId: fight.competitor2_id,
        firstRed,
        secondRed,
      });

      if (!losingCompetitorId) continue;

      const firstLoses = losingCompetitorId === fight.competitor1_id;
      await this.prisma.fights.update({
        where: { id: fight.id },
        data: {
          competitor1_score: firstLoses ? 0 : 10,
          competitor2_score: firstLoses ? 10 : 0,
          winner_id: firstLoses ? fight.competitor2_id : fight.competitor1_id,
          is_finished: true,
          forfeit_card_id: firstLoses ? firstRed?.id : secondRed?.id,
        },
      });

      if (fight.block?.type === BLOCK_OLYMPIC && fight.block_id) {
        olympicBlockIds.add(fight.block_id);
      }
    }

    for (const blockId of olympicBlockIds) {
      await this.progressOlympicBlock(blockId);
    }
  }

  async resetForfeitsForCard(cardId: number) {
    await this.prisma.fights.updateMany({
      where: { forfeit_card_id: cardId },
      data: {
        competitor1_score: 0,
        competitor2_score: 0,
        winner_id: null,
        is_finished: false,
        forfeit_card_id: null,
      },
    });
  }

  async resolveTies(dto: ResolveTiesDto) {
    const tournamentNomination = await this.getTournamentNomination(
      dto.tournament_id,
      dto.nomination_id,
    );
    const tieScope = dto.tie_scope ?? SCOPE_GROUP;

    await this.prisma.$transaction(async (tx) => {
      if (tieScope === SCOPE_OLYMPIC_THIRD) {
        if (!dto.block_id) {
          throw new BadRequestException('Block is required');
        }

        const block = await tx.competition_blocks.findUnique({
          where: { id: dto.block_id },
        });
        if (
          !block ||
          block.tournament_nomination_id !== tournamentNomination.id ||
          block.type !== BLOCK_GROUP
        ) {
          throw new BadRequestException('Group block is required');
        }

        await tx.competition_placements.deleteMany({
          where: {
            tournament_nomination_id: tournamentNomination.id,
            scope: SCOPE_OLYMPIC_THIRD,
            block_id: dto.block_id,
          },
        });
        await Promise.all(
          dto.ordered_competitor_ids.map((competitorId, index) =>
            tx.competition_placements.create({
              data: {
                tournament_nomination_id: tournamentNomination.id,
                block_id: dto.block_id,
                competitor_id: competitorId,
                scope: SCOPE_OLYMPIC_THIRD,
                place: index + 1,
              },
            }),
          ),
        );
        return;
      }

      if (!dto.group_id) {
        throw new BadRequestException('Group is required');
      }
      const groupId = dto.group_id;

      await tx.competition_placements.deleteMany({
        where: {
          tournament_nomination_id: tournamentNomination.id,
          scope: SCOPE_GROUP,
          group_id: groupId,
        },
      });
      await Promise.all(
        dto.ordered_competitor_ids.map((competitorId, index) =>
          tx.competition_placements.create({
            data: {
              tournament_nomination_id: tournamentNomination.id,
              group_id: groupId,
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
    let completedTournamentNominationId: number | null = null;

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
        data: {
          is_finished: true,
          is_open: false,
          rating_status: 'PENDING',
          rating_calculated_at: null,
          rating_error: null,
        },
      });
      completedTournamentNominationId = tournamentNomination.id;
    });

    this.scheduleRatingCalculation(completedTournamentNominationId);

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

  private async normalizeBronzeFinalFightNumbers(
    tournamentNominationId: number,
  ) {
    const blocks = await this.prisma.competition_blocks.findMany({
      where: {
        tournament_nomination_id: tournamentNominationId,
        type: BLOCK_OLYMPIC,
      },
      select: { id: true },
    });

    for (const block of blocks) {
      const [finalFight, bronzeFight] = await Promise.all([
        this.prisma.fights.findFirst({
          where: { block_id: block.id, is_bronze: false },
          orderBy: { bracket_round: 'desc' },
        }),
        this.prisma.fights.findFirst({
          where: { block_id: block.id, is_bronze: true },
        }),
      ]);

      if (
        !finalFight ||
        !bronzeFight ||
        bronzeFight.fight_number < finalFight.fight_number
      ) {
        continue;
      }

      await this.prisma.$transaction([
        this.prisma.fights.update({
          where: { id: bronzeFight.id },
          data: { fight_number: finalFight.fight_number },
        }),
        this.prisma.fights.update({
          where: { id: finalFight.id },
          data: { fight_number: bronzeFight.fight_number },
        }),
      ]);
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

  private async getAdvancingCompetitorsTx(
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
    const pendingTie = await this.getPendingTieTx(tx, blockId, 2);
    if (pendingTie) {
      throw new BadRequestException(
        'Resolve ranking ties before creating the next block',
      );
    }

    const rankedGroups: RankedGroup[] = [];
    for (const group of groups) {
      const rankings = await this.getGroupRankingsTx(tx, blockId, group.id);
      const ranked = rankCompetitors(rankings.stats, rankings.manualOrder);
      rankedGroups.push({ name: group.name, ranked });
    }
    const thirdPlaceManualOrder = await this.getOlympicThirdPlaceManualOrderTx(
      tx,
      blockId,
    );
    if (includeThirdPlaces) {
      const olympicThirdPlaceTie =
        await this.getPendingOlympicThirdPlaceTieFromRankedTx(
          tx,
          blockId,
          rankedGroups,
          thirdPlaceManualOrder,
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

  private async getOlympicThirdPlaceManualOrderTx(
    tx: PrismaTx,
    blockId: number,
  ) {
    return (
      await tx.competition_placements.findMany({
        where: { scope: SCOPE_OLYMPIC_THIRD, block_id: blockId },
        orderBy: { place: 'asc' },
      })
    ).map((placement) => placement.competitor_id);
  }

  private async getPendingOlympicThirdPlaceTieTx(
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

    for (const group of groups) {
      try {
        const rankings = await this.getGroupRankingsTx(tx, blockId, group.id);
        const ranked = rankCompetitors(rankings.stats, rankings.manualOrder);
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
    );
  }

  private async getPendingOlympicThirdPlaceTieFromRankedTx(
    tx: PrismaTx,
    blockId: number,
    rankedGroups: RankedGroup[],
    thirdPlaceManualOrder: number[],
    cachedGroupRankings = new Map<string, GroupRankings>(),
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
        (await this.getGroupRankingsTx(tx, blockId, group.id));
      const ranked = rankCompetitors(rankings.stats, rankings.manualOrder);
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

  private async getGroupRankingsTx(
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

  private async disciplinaryCardStorageExists() {
    const rows = await this.prisma.$queryRaw<
      Array<{ table_name: string | null }>
    >`
      SELECT to_regclass('public.disciplinary_cards')::text AS "table_name"
    `;

    return Boolean(rows[0]?.table_name);
  }

  private async getActiveRedCards(fighterIds: number[], checkDate: Date) {
    const activeCards: ActiveRedCard[] = [];

    for (const fighterId of fighterIds) {
      const rows = await this.prisma.$queryRaw<ActiveRedCard[]>`
        SELECT
          "id",
          "fighter_id",
          "received_at"
        FROM "disciplinary_cards"
        WHERE "fighter_id" = ${fighterId}
          AND "type" = 'RED'
          AND "received_at" <= ${checkDate}
          AND "expires_at" >= ${checkDate}
        ORDER BY "received_at" ASC, "id" ASC
        LIMIT 1
      `;
      const card = rows[0];

      if (card) activeCards.push(card);
    }

    return activeCards;
  }

  private getRedCardLosingCompetitorId(params: {
    firstCompetitorId: number;
    secondCompetitorId: number;
    firstRed?: ActiveRedCard;
    secondRed?: ActiveRedCard;
  }) {
    if (params.firstRed && !params.secondRed) return params.firstCompetitorId;
    if (!params.firstRed && params.secondRed) return params.secondCompetitorId;
    if (!params.firstRed || !params.secondRed) return null;

    const firstTime = params.firstRed.received_at.getTime();
    const secondTime = params.secondRed.received_at.getTime();

    if (firstTime !== secondTime) {
      return firstTime < secondTime
        ? params.firstCompetitorId
        : params.secondCompetitorId;
    }

    return params.firstRed.id <= params.secondRed.id
      ? params.firstCompetitorId
      : params.secondCompetitorId;
  }

  private async getTournamentCheckDate(tournamentId: number) {
    const tournament = await this.prisma.tournaments.findUnique({
      where: { id: tournamentId },
      select: { event_date: true },
    });

    if (!tournament) throw new NotFoundException('Tournament not found');

    return tournament.event_date
      ? this.toDateOnly(tournament.event_date)
      : this.toDateOnly(new Date());
  }

  private toDateOnly(value: string | Date) {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }

    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private async getPendingTie(
    blockId: number,
    places: number,
  ): Promise<PendingTieResult | null> {
    return this.getPendingTieTx(this.prisma, blockId, places);
  }

  private async getPendingTieTx(
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
            scope: SCOPE_GROUP,
          };
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  private async createBracketFightsFromSlotsTx(
    tx: PrismaTx,
    params: {
      blockId: number;
      tournamentId: number;
      nominationId: number;
      stage: number;
      round: number;
      slots: Array<{ competitor_id: number }>;
    },
  ) {
    let fightNumber = await this.getNextFightNumberTx(
      tx,
      params.tournamentId,
      params.nominationId,
    );

    for (let i = 0; i < params.slots.length; i += 2) {
      await tx.fights.create({
        data: {
          tournament_id: params.tournamentId,
          nomination_id: params.nominationId,
          block_id: params.blockId,
          competitor1_id: params.slots[i].competitor_id,
          competitor2_id: params.slots[i + 1].competitor_id,
          stage: params.stage,
          fight_number: fightNumber++,
          bracket_round: params.round,
          bracket_position: i / 2 + 1,
        },
      });
    }
  }

  private getPendingOlympicPairs(
    bracketSlots: Array<{
      id: number;
      competitor_id: number;
      slot_position: number;
    }>,
    fights: Array<{
      bracket_round: number | null;
      is_bronze: boolean | null;
      is_finished: boolean | null;
      winner_id: number | null;
    }>,
  ): {
    round: number;
    slots: Array<{ competitor_id: number; slot_position: number }>;
  } | null {
    const sortedSlots = [...bracketSlots].sort(
      (a, b) => a.slot_position - b.slot_position,
    );
    const slotCount = sortedSlots.length;
    if (!OLYMPIC_BRACKET_SIZES.some((size) => size === slotCount)) return null;

    const mainFights = fights.filter((fight) => !fight.is_bronze);
    if (!mainFights.length) {
      return { round: 1, slots: sortedSlots };
    }

    const mainRounds = Math.log2(slotCount);
    const semifinalRound = mainRounds - 1;
    const latestRound = Math.max(
      ...mainFights.map((fight) => fight.bracket_round ?? 1),
    );

    if (latestRound >= semifinalRound) return null;

    const nextRound = latestRound + 1;
    if (
      mainFights.some((fight) => (fight.bracket_round ?? 1) === nextRound)
    ) {
      return null;
    }

    const latestRoundFights = mainFights.filter(
      (fight) => (fight.bracket_round ?? 1) === latestRound,
    );
    if (
      !latestRoundFights.length ||
      latestRoundFights.some((fight) => !fight.is_finished || !fight.winner_id)
    ) {
      return null;
    }

    const winnerIds = new Set(
      latestRoundFights.map((fight) => fight.winner_id!),
    );
    const winnerSlots = sortedSlots.filter((slot) =>
      winnerIds.has(slot.competitor_id),
    );

    return winnerSlots.length === latestRoundFights.length
      ? { round: nextRound, slots: winnerSlots }
      : null;
  }

  private async reorderOlympicWinnerSlotsTx(
    tx: PrismaTx,
    blockId: number,
    winnerIds: number[],
  ) {
    const winnerSet = new Set(winnerIds);
    const slots = await tx.bracket_slots.findMany({
      where: { block_id: blockId },
      orderBy: { slot_position: 'asc' },
    });
    const orderedSlots = [
      ...slots.filter((slot) => winnerSet.has(slot.competitor_id)),
      ...slots.filter((slot) => !winnerSet.has(slot.competitor_id)),
    ];

    for (const [index, slot] of orderedSlots.entries()) {
      await tx.bracket_slots.update({
        where: { id: slot.id },
        data: { slot_position: -(index + 1) },
      });
    }

    for (const [index, slot] of orderedSlots.entries()) {
      await tx.bracket_slots.update({
        where: { id: slot.id },
        data: { slot_position: index + 1 },
      });
    }
  }

  async progressOlympicBlock(blockId: number) {
    let completedTournamentNominationId: number | null = null;

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

      const semifinalRound = mainRounds - 1;

      for (let round = 1; round < semifinalRound; round++) {
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
          await this.reorderOlympicWinnerSlotsTx(
            tx,
            blockId,
            fights.map((fight) => fight.winner_id!),
          );
          break;
        }
      }

      const semifinals = await tx.fights.findMany({
        where: {
          block_id: blockId,
          bracket_round: semifinalRound,
          is_bronze: false,
        },
        orderBy: { bracket_position: 'asc' },
      });
      const finalExists = await tx.fights.findFirst({
        where: {
          block_id: blockId,
          bracket_round: mainRounds,
          is_bronze: false,
        },
      });
      const bronzeExists = await tx.fights.findFirst({
        where: { block_id: blockId, is_bronze: true },
      });
      if (
        semifinals.length === 2 &&
        semifinals.every((fight) => fight.is_finished && fight.winner_id)
      ) {
        const losers = semifinals.map((fight) =>
          fight.winner_id === fight.competitor1_id
            ? fight.competitor2_id
            : fight.competitor1_id,
        );
        const winners = semifinals.map((fight) => fight.winner_id!);

        if (!bronzeExists) {
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

        if (!finalExists) {
          await tx.fights.create({
            data: {
              tournament_id: block.tournament_id,
              nomination_id: block.nomination_id,
              block_id: blockId,
              competitor1_id: winners[0],
              competitor2_id: winners[1],
              stage: block.stage,
              fight_number: fightNumber++,
              bracket_round: mainRounds,
              bracket_position: 1,
            },
          });
        }
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
        finalFight &&
        bronzeFight &&
        bronzeFight.fight_number > finalFight.fight_number
      ) {
        await tx.fights.update({
          where: { id: bronzeFight.id },
          data: { fight_number: finalFight.fight_number },
        });
        await tx.fights.update({
          where: { id: finalFight.id },
          data: { fight_number: bronzeFight.fight_number },
        });
        finalFight.fight_number = bronzeFight.fight_number;
      }
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
          data: {
            is_finished: true,
            is_open: false,
            rating_status: 'PENDING',
            rating_calculated_at: null,
            rating_error: null,
          },
        });
        completedTournamentNominationId = block.tournament_nomination_id;
      }
    });

    this.scheduleRatingCalculation(completedTournamentNominationId);
  }

  private scheduleRatingCalculation(tournamentNominationId: number | null) {
    if (!tournamentNominationId) return;

    void this.ratingsService.calculateForTournamentNomination(
      tournamentNominationId,
    );
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
