import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StartupDataRepairService implements OnApplicationBootstrap {
  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    await this.backfillChiefTournamentJudges();
  }

  async backfillChiefTournamentJudges() {
    await this.prisma.$executeRaw`
      WITH tournaments_without_chief AS (
        SELECT "tournament_id"
        FROM "tournament_marshals"
        GROUP BY "tournament_id"
        HAVING COUNT(*) FILTER (WHERE "is_chief_judge") = 0
      ),
      first_tournament_marshals AS (
        SELECT MIN("id") AS "id"
        FROM "tournament_marshals"
        WHERE "tournament_id" IN (
          SELECT "tournament_id" FROM tournaments_without_chief
        )
        GROUP BY "tournament_id"
      )
      UPDATE "tournament_marshals"
      SET "is_chief_judge" = TRUE
      WHERE "id" IN (SELECT "id" FROM first_tournament_marshals)
    `;
  }
}
