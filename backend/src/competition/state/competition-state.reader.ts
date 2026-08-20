import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BLOCK_OLYMPIC,
  BLOCK_GROUP,
  SCOPE_FINAL,
  SCOPE_GROUP,
  STATUS_ACTIVE,
} from '../competition.constants';
import type { PrismaTx } from '../competition-internal.types';
import { CompetitionRankingsService } from '../rankings/competition-rankings.service';
import { CompetitionWithdrawalService } from '../withdrawals/competition-withdrawal.service';

@Injectable()
export class CompetitionStateReader {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rankingsService: CompetitionRankingsService,
    private readonly withdrawalService: CompetitionWithdrawalService,
  ) {}

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
            warnings: { orderBy: { id: 'asc' } },
            round_scores: { orderBy: { round: 'asc' } },
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
        round_states: {
          orderBy: { round: 'asc' },
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
    const activeWithdrawals =
      await this.withdrawalService.getActiveWithdrawalsForTournamentNominationTx(
        this.prisma,
        tournamentNomination.id,
      );
    const activeBlock = blocks.find((block) => block.status === STATUS_ACTIVE);
    const activeGroupsCount =
      activeBlock?.type === BLOCK_GROUP ? activeBlock.groups.length : 0;
    let pendingTie = activeBlock
      ? await this.rankingsService.getPendingTie(
          activeBlock.id,
          activeGroupsCount === 1 ? 3 : 2,
        )
      : null;
    if (
      !pendingTie &&
      activeBlock?.type === BLOCK_GROUP &&
      activeGroupsCount > 1
    ) {
      pendingTie = await this.rankingsService.getPendingOlympicThirdPlaceTieTx(
        this.prisma,
        activeBlock.id,
      );
    }
    if (!pendingTie && activeBlock?.type === BLOCK_OLYMPIC) {
      pendingTie = await this.rankingsService.getPendingOlympicDoubleRedTieTx(
        this.prisma,
        activeBlock.id,
      );
    }

    return {
      tournamentNomination,
      blocks,
      placements,
      activeWithdrawals,
      activeBlockId: activeBlock?.id ?? null,
      isFinished: tournamentNomination.is_finished,
      pendingTie,
    };
  }

  async getTournamentNomination(tournamentId: number, nominationId: number) {
    const tournamentNomination =
      await this.prisma.tournament_nominations.findFirst({
        where: { tournament_id: tournamentId, nomination_id: nominationId },
        include: { nomination: true },
      });
    if (!tournamentNomination) {
      throw new NotFoundException('Tournament nomination not found');
    }
    return tournamentNomination;
  }

  async getTournamentNominationTx(
    tx: PrismaTx,
    tournamentId: number,
    nominationId: number,
  ) {
    const tournamentNomination = await tx.tournament_nominations.findFirst({
      where: { tournament_id: tournamentId, nomination_id: nominationId },
    });
    if (!tournamentNomination) {
      throw new NotFoundException('Tournament nomination not found');
    }
    return tournamentNomination;
  }

  getActiveBlockTx(tx: PrismaTx, tournamentNominationId: number) {
    return tx.competition_blocks.findFirst({
      where: {
        tournament_nomination_id: tournamentNominationId,
        status: STATUS_ACTIVE,
      },
      orderBy: { stage: 'desc' },
    });
  }

  async getNextStageTx(tx: PrismaTx, tournamentNominationId: number) {
    const lastBlock = await tx.competition_blocks.findFirst({
      where: { tournament_nomination_id: tournamentNominationId },
      orderBy: { stage: 'desc' },
    });
    return (lastBlock?.stage ?? 0) + 1;
  }

  getRegisteredCompetitorsTx(
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

  async getTournamentNominationId(tournamentId: number, nominationId: number) {
    return (await this.getTournamentNomination(tournamentId, nominationId)).id;
  }

  async getFightContext(fightId: number) {
    const fight = await this.prisma.fights.findUnique({
      where: { id: fightId },
      select: { tournament_id: true, nomination_id: true },
    });
    if (!fight) throw new NotFoundException('Fight not found');
    return fight;
  }

  async getWithdrawalContext(withdrawalId: number) {
    const withdrawal = await this.prisma.fighter_withdrawals.findUnique({
      where: { id: withdrawalId },
      select: { tournament_id: true, nomination_id: true },
    });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    return withdrawal;
  }
}
