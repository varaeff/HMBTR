import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompetitionWithdrawalService } from '../withdrawals/competition-withdrawal.service';
import { CompetitionOlympicService } from './competition-olympic.service';

@Injectable()
export class CompetitionOlympicProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly olympicService: CompetitionOlympicService,
    private readonly withdrawalService: CompetitionWithdrawalService,
  ) {}

  async progressOlympicBlock(blockId: number) {
    const block = await this.prisma.competition_blocks.findUnique({
      where: { id: blockId },
      select: { tournament_id: true },
    });
    await this.prisma.$transaction((tx) =>
      this.olympicService.progressOlympicBlockTx(tx, blockId),
    );
    if (block) {
      await this.withdrawalService.applyWithdrawalForfeits(block.tournament_id);
    }
  }
}
