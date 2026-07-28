import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  LIFECYCLE_FIGHTS_EDITABLE,
  LIFECYCLE_RESULTS_FIXED,
  STATUS_ACTIVE,
} from '../competition.constants';
import { assertSingleTransition } from '../competition.helpers';
import type { PrismaTx } from '../competition-internal.types';
import { CompetitionOlympicService } from '../olympic/competition-olympic.service';
import { CompetitionRankingsService } from '../rankings/competition-rankings.service';
import type { OlympicRoundPlan, ResultBlock } from './result-types';

@Injectable()
export class ResultFixationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rankingsService: CompetitionRankingsService,
    private readonly olympicService: CompetitionOlympicService,
  ) {}

  async getOlympicMainRounds(blockId: number) {
    return Math.log2(
      await this.prisma.bracket_slots.count({ where: { block_id: blockId } }),
    );
  }

  async assertGroupStillEditableTx(tx: PrismaTx, block: ResultBlock) {
    const editableBlockCount = await tx.competition_blocks.count({
      where: {
        id: block.id,
        lifecycle_state: LIFECYCLE_FIGHTS_EDITABLE,
        status: STATUS_ACTIVE,
      },
    });
    if (editableBlockCount !== 1) {
      assertSingleTransition(editableBlockCount);
    }
  }

  async fixGroupResultsTx(tx: PrismaTx, block: ResultBlock, places: number) {
    if (await this.rankingsService.getPendingTieTx(tx, block.id, places)) {
      return;
    }

    const transition = await tx.competition_blocks.updateMany({
      where: {
        id: block.id,
        lifecycle_state: LIFECYCLE_FIGHTS_EDITABLE,
        status: STATUS_ACTIVE,
      },
      data: { lifecycle_state: LIFECYCLE_RESULTS_FIXED },
    });
    assertSingleTransition(transition.count);
  }

  async fixOlympicRoundTx(
    tx: PrismaTx,
    block: ResultBlock,
    plan: OlympicRoundPlan,
  ) {
    const transition = await tx.competition_round_states.updateMany({
      where: { id: plan.state.id, pairs_fixed: true, results_fixed: false },
      data: { results_fixed: true },
    });
    assertSingleTransition(transition.count);
    await this.olympicService.progressOlympicBlockTx(tx, block.id);
  }
}
