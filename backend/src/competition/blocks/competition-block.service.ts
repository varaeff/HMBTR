import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  generateCompetitionGroups,
  OLYMPIC_BRACKET_SIZES,
  seedGroupDerivedOlympicSlots,
  seedOlympicSlots,
} from '../competition.logic';
import {
  BLOCK_GROUP,
  BLOCK_OLYMPIC,
  LIFECYCLE_RESULTS_FIXED,
  STATUS_ACTIVE,
  STATUS_LOCKED,
} from '../competition.constants';
import { assertSingleTransition } from '../competition.helpers';
import type { PrismaTx } from '../competition-internal.types';
import { CreateCompetitionBlockDto } from '../dto/create-competition-block.dto';
import { CompetitionRankingsService } from '../rankings/competition-rankings.service';
import { CompetitionStateReader } from '../state/competition-state.reader';

@Injectable()
export class CompetitionBlockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateReader: CompetitionStateReader,
    private readonly rankingsService: CompetitionRankingsService,
  ) {}

  async createGroupBlock(dto: CreateCompetitionBlockDto) {
    await this.prisma.$transaction(async (tx) => {
      const tournamentNomination =
        await this.stateReader.getTournamentNominationTx(
          tx,
          dto.tournament_id,
          dto.nomination_id,
        );
      if (tournamentNomination.is_finished) {
        throw new BadRequestException('Nomination is finished');
      }

      const activeBlock = await this.stateReader.getActiveBlockTx(
        tx,
        tournamentNomination.id,
      );
      if (!activeBlock && tournamentNomination.is_open) {
        throw new BadRequestException('Close fighter registration first');
      }
      if (
        activeBlock &&
        activeBlock.lifecycle_state !== LIFECYCLE_RESULTS_FIXED
      ) {
        throw new BadRequestException('Fix current stage results first');
      }
      const competitors = activeBlock
        ? await this.rankingsService.getAdvancingCompetitorsTx(
            tx,
            activeBlock.id,
          )
        : await this.stateReader.getRegisteredCompetitorsTx(
            tx,
            dto.tournament_id,
            dto.nomination_id,
          );

      if (competitors.length < 3) {
        throw new BadRequestException('At least 3 fighters are required');
      }

      if (activeBlock) {
        const transition = await tx.competition_blocks.updateMany({
          where: { id: activeBlock.id, status: STATUS_ACTIVE },
          data: { status: STATUS_LOCKED },
        });
        assertSingleTransition(transition.count);
      }

      const nextStage = await this.stateReader.getNextStageTx(
        tx,
        tournamentNomination.id,
      );
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
      const stageTransition = await tx.tournament_nominations.updateMany({
        where: { id: tournamentNomination.id, stage: nextStage - 1 },
        data: { stage: nextStage },
      });
      assertSingleTransition(stageTransition.count);
    });

    return this.stateReader.getState(dto.tournament_id, dto.nomination_id);
  }

  async createOlympicBlock(dto: CreateCompetitionBlockDto) {
    await this.prisma.$transaction(async (tx) => {
      const tournamentNomination =
        await this.stateReader.getTournamentNominationTx(
          tx,
          dto.tournament_id,
          dto.nomination_id,
        );
      if (tournamentNomination.is_finished) {
        throw new BadRequestException('Nomination is finished');
      }

      const activeBlock = await this.stateReader.getActiveBlockTx(
        tx,
        tournamentNomination.id,
      );
      if (!activeBlock && tournamentNomination.is_open) {
        throw new BadRequestException('Close fighter registration first');
      }
      if (
        activeBlock &&
        activeBlock.lifecycle_state !== LIFECYCLE_RESULTS_FIXED
      ) {
        throw new BadRequestException('Fix current stage results first');
      }
      const competitors = activeBlock
        ? await this.rankingsService.getAdvancingCompetitorsTx(
            tx,
            activeBlock.id,
            Boolean(dto.include_third_places),
          )
        : await this.stateReader.getRegisteredCompetitorsTx(
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
        const transition = await tx.competition_blocks.updateMany({
          where: { id: activeBlock.id, status: STATUS_ACTIVE },
          data: { status: STATUS_LOCKED },
        });
        assertSingleTransition(transition.count);
      }

      const nextStage = await this.stateReader.getNextStageTx(
        tx,
        tournamentNomination.id,
      );
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

      const seeded = activeBlock
        ? seedGroupDerivedOlympicSlots(competitors)
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
      await tx.competition_round_states.create({
        data: { block_id: block.id, round: 1 },
      });
      const stageTransition = await tx.tournament_nominations.updateMany({
        where: { id: tournamentNomination.id, stage: nextStage - 1 },
        data: { stage: nextStage },
      });
      assertSingleTransition(stageTransition.count);
    });

    return this.stateReader.getState(dto.tournament_id, dto.nomination_id);
  }

  async getGroupStartIndexTx(
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

  private async createDraftGroupsTx(
    tx: PrismaTx,
    blockId: number,
    stage: number,
    dto: CreateCompetitionBlockDto,
    competitors: Awaited<
      ReturnType<CompetitionStateReader['getRegisteredCompetitorsTx']>
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
}
