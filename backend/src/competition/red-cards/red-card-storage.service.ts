import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ActiveRedCard } from '../competition-internal.types';

@Injectable()
export class RedCardStorageService {
  constructor(private readonly prisma: PrismaService) {}

  async disciplinaryCardStorageExists() {
    const rows = await this.prisma.$queryRaw<
      Array<{ table_name: string | null }>
    >`
      SELECT to_regclass('public.disciplinary_cards')::text AS "table_name"
    `;

    return Boolean(rows[0]?.table_name);
  }

  async getActiveRedCards(fighterIds: number[], checkDate: Date) {
    const activeCards: ActiveRedCard[] = [];

    for (const fighterId of fighterIds) {
      const rows = await this.prisma.$queryRaw<ActiveRedCard[]>`
        SELECT
          dc."id",
          dc."fighter_id",
          dc."fight_id",
          dc."received_at",
          source_fight."block_id" AS "source_block_id",
          source_block."type" AS "source_block_type",
          source_fight."fight_number" AS "source_fight_number",
          source_fight."tournament_id" AS "source_tournament_id",
          source_fight."nomination_id" AS "source_nomination_id"
        FROM "disciplinary_cards" dc
        LEFT JOIN "fights" source_fight ON source_fight."id" = dc."fight_id"
        LEFT JOIN "competition_blocks" source_block ON source_block."id" = source_fight."block_id"
        WHERE dc."fighter_id" = ${fighterId}
          AND dc."type" = 'RED'
          AND dc."active" = true
          AND dc."received_at" <= ${checkDate}
          AND dc."expires_at" >= ${checkDate}
        ORDER BY dc."received_at" ASC, dc."id" ASC
      `;

      activeCards.push(...rows);
    }

    return activeCards;
  }

  async getTournamentCheckDate(tournamentId: number) {
    const tournament = await this.prisma.tournaments.findUnique({
      where: { id: tournamentId },
      select: { event_date: true },
    });

    if (!tournament) throw new NotFoundException('Tournament not found');

    return tournament.event_date
      ? this.toDateOnly(tournament.event_date)
      : this.toDateOnly(new Date());
  }

  private toDateOnly(value: string | Date) {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }

    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }
}
