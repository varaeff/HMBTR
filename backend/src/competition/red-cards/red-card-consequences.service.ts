import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BLOCK_OLYMPIC, STATUS_ACTIVE } from '../competition.constants';
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
      await this.prisma.$transaction((tx) =>
        this.olympicService.progressOlympicBlockTx(tx, block.id),
      );
    }

    await this.forfeitService.applyRedCardForfeitsPass(tournamentId, checkDate);
  }
}
