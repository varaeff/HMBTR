import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TournamentFightNumberNormalizer {
  constructor(private readonly prisma: PrismaService) {}

  async normalizeTournamentBronzeFinalFightNumbers(tournamentId: number) {
    const blocks = await this.prisma.competition_blocks.findMany({
      where: {
        tournament_id: tournamentId,
        type: 'OLYMPIC',
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

      // Report numbering keeps bronze before final even for older generated brackets.
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
}
