import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompetitionOlympicService } from './competition-olympic.service';

@Injectable()
export class CompetitionOlympicProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly olympicService: CompetitionOlympicService,
  ) {}

  progressOlympicBlock(blockId: number) {
    return this.prisma.$transaction((tx) =>
      this.olympicService.progressOlympicBlockTx(tx, blockId),
    );
  }
}
