import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BLOCK_GROUP,
  BLOCK_OLYMPIC,
  LIFECYCLE_FIGHTS_EDITABLE,
  LIFECYCLE_FORMATION_EDITABLE,
  LIFECYCLE_RESULTS_FIXED,
  SCOPE_GROUP,
  SCOPE_OLYMPIC_THIRD,
  STATUS_ACTIVE,
} from '../competition.constants';
import { assertSingleTransition } from '../competition.helpers';
import { CompetitionRedCardService } from '../competition-red-card.service';
import { CompetitionLifecycleDto } from '../dto/competition-lifecycle.dto';
import { CompetitionFightService } from '../fights/competition-fight.service';
import { CompetitionFinishService } from '../finish/competition-finish.service';
import { CompetitionStateReader } from '../state/competition-state.reader';
import { CompetitionWithdrawalService } from '../withdrawals/competition-withdrawal.service';

@Injectable()
export class CompetitionLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateReader: CompetitionStateReader,
    private readonly fightService: CompetitionFightService,
    private readonly finishService: CompetitionFinishService,
    private readonly redCardService: CompetitionRedCardService,
    private readonly withdrawalService: CompetitionWithdrawalService,
  ) {}

  async cancelResultsFixation(dto: CompetitionLifecycleDto) {
    const block = await this.prisma.competition_blocks.findUnique({
      where: { id: dto.block_id },
      include: {
        round_states: true,
        tournament_nomination: true,
        groups: true,
      },
    });
    if (!block) throw new NotFoundException('Block not found');
    if (
      block.status !== STATUS_ACTIVE ||
      block.tournament_nomination.is_finished
    ) {
      throw new BadRequestException('Block is locked');
    }

    if (block.type === BLOCK_GROUP) {
      if (block.lifecycle_state !== LIFECYCLE_RESULTS_FIXED) {
        throw new BadRequestException('Group results are not fixed');
      }
      await this.prisma.$transaction(async (tx) => {
        await tx.competition_placements.deleteMany({
          where: {
            tournament_nomination_id: block.tournament_nomination_id,
            OR: [
              { block_id: block.id, scope: SCOPE_OLYMPIC_THIRD },
              {
                group_id: { in: block.groups.map((group) => group.id) },
                scope: SCOPE_GROUP,
              },
            ],
          },
        });
        await tx.fights.updateMany({
          where: {
            block_id: block.id,
            forfeit_card_id: null,
            forfeit_withdrawal_id: null,
          },
          data: { is_finished: false, winner_id: null },
        });
        const transition = await tx.competition_blocks.updateMany({
          where: {
            id: block.id,
            lifecycle_state: LIFECYCLE_RESULTS_FIXED,
          },
          data: { lifecycle_state: LIFECYCLE_FIGHTS_EDITABLE },
        });
        assertSingleTransition(transition.count);
      });
    } else {
      const round = dto.round;
      if (!round) throw new BadRequestException('Olympic round is required');
      const state = block.round_states.find((item) => item.round === round);
      const laterState = block.round_states.some((item) => item.round > round);
      if (!state?.results_fixed || laterState) {
        throw new BadRequestException('Olympic results cannot be unfixed now');
      }
      const transition = await this.prisma.competition_round_states.updateMany({
        where: { id: state.id, results_fixed: true },
        data: { results_fixed: false },
      });
      assertSingleTransition(transition.count);
      await this.prisma.fights.updateMany({
        where: {
          block_id: block.id,
          bracket_round: round,
          forfeit_card_id: null,
          forfeit_withdrawal_id: null,
        },
        data: { is_finished: false, winner_id: null },
      });
    }

    await this.finishService.resetRatingState(block.tournament_nomination_id);
    return this.stateReader.getState(block.tournament_id, block.nomination_id);
  }

  async cancelFightsFixation(dto: CompetitionLifecycleDto) {
    const block = await this.prisma.competition_blocks.findUnique({
      where: { id: dto.block_id },
      include: { round_states: true, tournament_nomination: true },
    });
    if (!block) throw new NotFoundException('Block not found');
    if (
      block.status !== STATUS_ACTIVE ||
      block.tournament_nomination.is_finished
    ) {
      throw new BadRequestException('Block is locked');
    }

    if (block.type === BLOCK_GROUP) {
      if (block.lifecycle_state !== LIFECYCLE_FIGHTS_EDITABLE) {
        throw new BadRequestException('Group fights cannot be canceled now');
      }
      await this.prisma.$transaction(async (tx) => {
        await this.redCardService.resetForfeitsForDeletedFightsTx(tx, block.id);
        await this.withdrawalService.resetForfeitsForDeletedFightsTx(
          tx,
          block.id,
        );
        await tx.fights.deleteMany({ where: { block_id: block.id } });
        await tx.competition_placements.deleteMany({
          where: { block_id: block.id },
        });
        const transition = await tx.competition_blocks.updateMany({
          where: {
            id: block.id,
            lifecycle_state: LIFECYCLE_FIGHTS_EDITABLE,
          },
          data: { lifecycle_state: LIFECYCLE_FORMATION_EDITABLE },
        });
        assertSingleTransition(transition.count);
      });
    } else {
      const round = dto.round;
      if (!round) throw new BadRequestException('Olympic round is required');
      const state = block.round_states.find((item) => item.round === round);
      if (!state?.pairs_fixed || state.results_fixed) {
        throw new BadRequestException(
          'Olympic pair fixation cannot be canceled now',
        );
      }
      await this.prisma.$transaction(async (tx) => {
        await this.redCardService.resetForfeitsForDeletedFightsTx(
          tx,
          block.id,
          round,
        );
        await this.withdrawalService.resetForfeitsForDeletedFightsTx(
          tx,
          block.id,
          round,
          { includeCurrentRoundBronze: false },
        );
        await tx.fights.deleteMany({
          where: {
            block_id: block.id,
            OR: [
              { bracket_round: round },
              { is_bronze: true, bracket_round: { gt: round } },
            ],
          },
        });
        const transition = await tx.competition_round_states.updateMany({
          where: { id: state.id, pairs_fixed: true, results_fixed: false },
          data: { pairs_fixed: false },
        });
        assertSingleTransition(transition.count);
      });
    }

    await this.afterBackwardTransition(block);
    return this.stateReader.getState(block.tournament_id, block.nomination_id);
  }

  async rollback(dto: CompetitionLifecycleDto) {
    const block = await this.prisma.competition_blocks.findUnique({
      where: { id: dto.block_id },
      include: {
        round_states: true,
        tournament_nomination: true,
        bracket_slots: true,
      },
    });
    if (!block) throw new NotFoundException('Block not found');
    if (
      block.status !== STATUS_ACTIVE ||
      block.tournament_nomination.is_finished
    ) {
      throw new BadRequestException('Block is locked');
    }

    if (block.type === BLOCK_OLYMPIC && dto.round && dto.round > 1) {
      const round = dto.round;
      const latestRound = Math.max(
        ...block.round_states.map((state) => state.round),
      );
      if (round !== latestRound) {
        throw new BadRequestException(
          'Only the latest Olympic round can be rolled back',
        );
      }
      const state = block.round_states.find((item) => item.round === round);
      const previousState = block.round_states.find(
        (item) => item.round === round - 1,
      );
      const finalRound = Math.log2(block.bracket_slots.length);
      const previousForfeitRoundComplete =
        previousState && !previousState.results_fixed
        ? await this.isOlympicRoundFullyServerForfeited(
            block.id,
            round - 1,
            finalRound,
          )
        : false;
      if (
        !state ||
        !previousState ||
        (!previousState.results_fixed && !previousForfeitRoundComplete) ||
        state.results_fixed ||
        (state.pairs_fixed && round !== finalRound)
      ) {
        throw new BadRequestException('Reverse the latest fixation first');
      }
      await this.prisma.$transaction(async (tx) => {
        await this.redCardService.resetForfeitsForDeletedFightsTx(
          tx,
          block.id,
          round,
        );
        await this.withdrawalService.resetForfeitsForDeletedFightsTx(
          tx,
          block.id,
          round,
        );
        await tx.fights.deleteMany({
          where: {
            block_id: block.id,
            OR: [
              { bracket_round: round },
              { is_bronze: true, bracket_round: { gte: round } },
            ],
          },
        });
        await tx.competition_round_states.delete({
          where: { block_id_round: { block_id: block.id, round } },
        });
        if (previousState.results_fixed) {
          const previousTransition =
            await tx.competition_round_states.updateMany({
            where: { id: previousState.id, results_fixed: true },
            data: { results_fixed: false },
            });
          assertSingleTransition(previousTransition.count);
        }
        await tx.fights.updateMany({
          where: {
            block_id: block.id,
            bracket_round: round - 1,
            forfeit_card_id: null,
            forfeit_withdrawal_id: null,
          },
          data: { is_finished: false, winner_id: null },
        });
      });
    } else {
      if (
        block.type === BLOCK_GROUP &&
        block.lifecycle_state !== LIFECYCLE_FORMATION_EDITABLE
      ) {
        throw new BadRequestException('Cancel group fixation before returning');
      }
      if (
        block.type === BLOCK_OLYMPIC &&
        block.round_states.some(
          (state) => state.pairs_fixed || state.results_fixed,
        )
      ) {
        throw new BadRequestException(
          'Cancel Olympic fixation before returning',
        );
      }
      const firstStage = block.stage === 1;
      if (dto.remove_active_red_competitors && !firstStage) {
        throw new BadRequestException(
          'Active red rollback is allowed only for the first block',
        );
      }
      await this.prisma.$transaction(async (tx) => {
        await this.redCardService.resetForfeitsForDeletedFightsTx(tx, block.id);
        await this.withdrawalService.resetForfeitsForDeletedFightsTx(
          tx,
          block.id,
        );
        await tx.competition_blocks.delete({ where: { id: block.id } });
        const previous = await tx.competition_blocks.findFirst({
          where: { tournament_nomination_id: block.tournament_nomination_id },
          orderBy: { stage: 'desc' },
        });
        if (previous) {
          await tx.competition_blocks.update({
            where: { id: previous.id },
            data: { status: STATUS_ACTIVE },
          });
        }
        await tx.tournament_nominations.update({
          where: { id: block.tournament_nomination_id },
          data: {
            stage: previous?.stage ?? 0,
            is_open: firstStage,
          },
        });
        if (dto.remove_active_red_competitors && firstStage) {
          await this.redCardService.removeActiveRedCompetitorsFromRegistrationTx(
            tx,
            block,
          );
        }
      });
    }

    await this.afterBackwardTransition(block);
    return this.stateReader.getState(block.tournament_id, block.nomination_id);
  }

  private async isOlympicRoundFullyServerForfeited(
    blockId: number,
    round: number,
    finalRound: number,
  ) {
    const fights = await this.prisma.fights.findMany({
      where: {
        block_id: blockId,
        OR:
          round === finalRound
            ? [{ bracket_round: round }, { is_bronze: true }]
            : [{ bracket_round: round, is_bronze: false }],
      },
      select: {
        winner_id: true,
        is_finished: true,
        forfeit_card_id: true,
        forfeit_withdrawal_id: true,
      },
    });

    return (
      fights.length > 0 &&
      fights.every(
        (fight) =>
          fight.is_finished &&
          fight.winner_id &&
          (fight.forfeit_card_id || fight.forfeit_withdrawal_id),
      )
    );
  }

  private async afterBackwardTransition(block: {
    tournament_id: number;
    nomination_id: number;
    tournament_nomination_id: number;
  }) {
    await this.fightService.renumberNominationFights(
      block.tournament_id,
      block.nomination_id,
    );
    await this.finishService.resetRatingState(block.tournament_nomination_id);
    await this.redCardService.applyRedCardForfeits(block.tournament_id);
    await this.withdrawalService.applyWithdrawalForfeits(block.tournament_id);
  }
}
