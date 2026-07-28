import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DisciplinaryCardStorage } from '../cards/disciplinary-card-storage';
import { DisciplinaryCardExpirationService } from '../expiration/disciplinary-card-expiration.service';

@Injectable()
export class ActiveRedCardService {
  constructor(
    private prisma: PrismaService,
    private storage: DisciplinaryCardStorage,
    private expiration: DisciplinaryCardExpirationService,
  ) {}

  async hasActiveRedForTournament(fighterId: number, tournamentId: number) {
    const fighterIds =
      await this.getActiveRedFighterIdsForTournament(tournamentId);

    return fighterIds.includes(fighterId);
  }

  async getActiveRedFighterIdsForTournament(tournamentId: number) {
    await this.storage.ensureStorageReady();

    const checkDate =
      await this.expiration.getTournamentCheckDate(tournamentId);
    const rows = await this.prisma.$queryRaw<Array<{ fighter_id: number }>>`
      SELECT DISTINCT "fighter_id"
      FROM "disciplinary_cards"
      WHERE "type" = 'RED'
        AND "active" = true
        AND "received_at" <= ${checkDate}
        AND "expires_at" >= ${checkDate}
    `;

    return rows.map((row) => row.fighter_id);
  }
}
