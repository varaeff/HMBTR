import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BLOCK_OLYMPIC, STATUS_ACTIVE } from '../competition.constants';
import type { PrismaTx } from '../competition-internal.types';
import { CompetitionOlympicService } from '../olympic/competition-olympic.service';
import { RedCardForfeitService } from './red-card-forfeit.service';
import { RedCardStorageService } from './red-card-storage.service';

@Injectable()
export class RedCardConsequencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: RedCardStorageService,
    private readonly forfeitService: RedCardForfeitService,
    private readonly olympicService: CompetitionOlympicService,
  ) {}

  async applyRedCardForfeits(tournamentId: number) {
    if (!(await this.storageService.disciplinaryCardStorageExists())) return;

    const checkDate =
      await this.storageService.getTournamentCheckDate(tournamentId);
    await this.forfeitService.applyRedCardForfeitsPass(tournamentId, checkDate);
  }

  async applyRedCardConsequences(tournamentId: number) {
    if (!(await this.storageService.disciplinaryCardStorageExists())) return;

    const checkDate =
      await this.storageService.getTournamentCheckDate(tournamentId);
    await this.forfeitService.applyRedCardForfeitsPass(tournamentId, checkDate);

    const olympicBlocks = await this.prisma.competition_blocks.findMany({
      where: {
        tournament_id: tournamentId,
        type: BLOCK_OLYMPIC,
        status: STATUS_ACTIVE,
      },
      select: { id: true },
    });
    for (const block of olympicBlocks) {
      await this.prisma.$transaction(async (tx) => {
        await this.fixCompletedForfeitOlympicRoundsTx(tx, block.id);
        await this.olympicService.progressOlympicBlockTx(tx, block.id);
      });
    }

    await this.forfeitService.applyRedCardForfeitsPass(tournamentId, checkDate);
    for (const block of olympicBlocks) {
      await this.prisma.$transaction((tx) =>
        this.fixCompletedForfeitOlympicRoundsTx(tx, block.id),
      );
    }
  }

  private async fixCompletedForfeitOlympicRoundsTx(
    tx: PrismaTx,
    blockId: number,
  ) {
    const [slotCount, states] = await Promise.all([
      tx.bracket_slots.count({ where: { block_id: blockId } }),
      tx.competition_round_states.findMany({
        where: { block_id: blockId },
        orderBy: { round: 'asc' },
      }),
    ]);
    const finalRound = Math.log2(slotCount);

    for (const state of states) {
      if (!state.pairs_fixed || state.results_fixed) continue;

      const fights = await tx.fights.findMany({
        where: {
          block_id: blockId,
          OR:
            state.round === finalRound
              ? [{ bracket_round: state.round }, { is_bronze: true }]
              : [{ bracket_round: state.round, is_bronze: false }],
        },
        select: {
          id: true,
          winner_id: true,
          is_finished: true,
          forfeit_card_id: true,
        },
      });
      if (
        !fights.length ||
        fights.some(
          (fight) =>
            !fight.is_finished || !fight.winner_id || !fight.forfeit_card_id,
        )
      ) {
        continue;
      }

      await tx.competition_round_states.updateMany({
        where: { id: state.id, pairs_fixed: true, results_fixed: false },
        data: { results_fixed: true },
      });
    }
  }
}
