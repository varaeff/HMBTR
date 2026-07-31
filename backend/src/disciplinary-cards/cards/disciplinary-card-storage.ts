import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  InsertDisciplinaryCardParams,
  StoredDisciplinaryCard,
  UpdateDisciplinaryCardParams,
} from '../disciplinary-card.types';

@Injectable()
export class DisciplinaryCardStorage {
  constructor(private prisma: PrismaService) {}

  async ensureStorageReady() {
    const rows = await this.prisma.$queryRaw<
      Array<{ cards_table: string | null; source_table: string | null }>
    >`
      SELECT
        to_regclass('public.disciplinary_cards')::text AS "cards_table",
        to_regclass('public.red_card_yellow_sources')::text AS "source_table"
    `;

    if (!rows[0]?.cards_table || !rows[0]?.source_table) {
      throw new BadRequestException(
        'Disciplinary card storage is not ready. Run prisma db push.',
      );
    }
  }

  async getStoredCard(id: number) {
    const rows = await this.prisma.$queryRaw<StoredDisciplinaryCard[]>`
      SELECT
        "id",
        "fighter_id",
        "tournament_id",
        "fight_id",
        "marshal_id",
        "type",
        "source",
        "received_at",
        "reason",
        "expires_at",
        "active",
        "created_at",
        "updated_at"
      FROM "disciplinary_cards"
      WHERE "id" = ${id}
      LIMIT 1
    `;
    const card = rows[0];

    if (!card) throw new NotFoundException('Disciplinary card not found');

    return card;
  }

  async insertCard(params: InsertDisciplinaryCardParams) {
    const rows = await this.prisma.$queryRaw<StoredDisciplinaryCard[]>`
      INSERT INTO "disciplinary_cards"
        (
          "fighter_id",
          "tournament_id",
          "fight_id",
          "marshal_id",
          "type",
          "source",
          "received_at",
          "reason",
          "expires_at",
          "active",
          "created_at",
          "updated_at"
        )
      VALUES
        (
          ${params.fighterId},
          ${params.tournamentId},
          ${params.fightId},
          ${params.marshalId},
          ${params.type},
          ${params.source},
          ${params.receivedAt},
          ${params.reason},
          ${params.expiresAt},
          ${params.active},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      RETURNING
        "id",
        "fighter_id",
        "tournament_id",
        "fight_id",
        "marshal_id",
        "type",
        "source",
        "received_at",
        "reason",
        "expires_at",
        "active",
        "created_at",
        "updated_at"
    `;

    return rows[0];
  }

  async updateCard(params: UpdateDisciplinaryCardParams) {
    await this.prisma.$executeRaw`
      UPDATE "disciplinary_cards"
      SET
        "reason" = ${params.reason},
        "type" = ${params.type},
        "marshal_id" = ${params.marshalId},
        "active" = ${params.active},
        "expires_at" = ${params.expiresAt},
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = ${params.id}
    `;
  }

  async deleteCard(id: number) {
    await this.prisma.$executeRaw`
      DELETE FROM "disciplinary_cards"
      WHERE "id" = ${id}
    `;
  }
}
