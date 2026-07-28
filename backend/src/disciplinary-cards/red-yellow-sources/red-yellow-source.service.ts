import { Injectable } from '@nestjs/common';
import { CompetitionService } from '../../competition/competition.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DisciplinaryCardStorage } from '../cards/disciplinary-card-storage';
import type { StoredDisciplinaryCard } from '../disciplinary-card.types';

@Injectable()
export class RedYellowSourceService {
  constructor(
    private prisma: PrismaService,
    private competitionService: CompetitionService,
    private storage: DisciplinaryCardStorage,
  ) {}

  async isYellowExpirationLocked(yellowCardId: number) {
    const rows = await this.prisma.$queryRaw<Array<{ locked: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM "red_card_yellow_sources" source
        JOIN "disciplinary_cards" red
          ON red."id" = source."red_card_id"
        WHERE source."yellow_card_id" = ${yellowCardId}
          AND source."closed_at" IS NOT NULL
          AND red."type" = 'RED'
          AND red."source" = 'AUTOMATIC'
      ) AS "locked"
    `;

    return rows[0]?.locked ?? false;
  }

  async updateAutomaticRedMarshalFromTriggerYellow(
    yellowCard: StoredDisciplinaryCard,
  ) {
    await this.prisma.$executeRaw`
      UPDATE "disciplinary_cards" red
      SET
        "marshal_id" = ${yellowCard.marshal_id},
        "updated_at" = CURRENT_TIMESTAMP
      FROM "red_card_yellow_sources" source
      WHERE source."red_card_id" = red."id"
        AND source."yellow_card_id" = ${yellowCard.id}
        AND red."type" = 'RED'
        AND red."source" = 'AUTOMATIC'
        AND red."fight_id" = ${yellowCard.fight_id}
        AND red."received_at" = ${yellowCard.received_at}
    `;
  }

  async recordRedYellowSources(redCardId: number, yellowCardIds: number[]) {
    await Promise.all(
      yellowCardIds.map(
        (yellowCardId) =>
          this.prisma.$executeRaw`
          INSERT INTO "red_card_yellow_sources"
            ("red_card_id", "yellow_card_id", "created_at")
          VALUES
            (${redCardId}, ${yellowCardId}, CURRENT_TIMESTAMP)
          ON CONFLICT ("red_card_id", "yellow_card_id") DO NOTHING
        `,
      ),
    );
  }

  async closeSourceYellowsForRed(redCardId: number, closedAt: Date) {
    await this.prisma.$executeRaw`
      UPDATE "red_card_yellow_sources" source
      SET
        "yellow_expires_at_before_close" = yellow."expires_at",
        "yellow_active_before_close" = yellow."active",
        "closed_at" = ${closedAt}
      FROM "disciplinary_cards" yellow
      WHERE source."red_card_id" = ${redCardId}
        AND source."yellow_card_id" = yellow."id"
        AND source."closed_at" IS NULL
    `;

    await this.prisma.$executeRaw`
      UPDATE "disciplinary_cards"
      SET
        "active" = false,
        "expires_at" = ${closedAt},
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "type" = 'YELLOW'
        AND "active" = true
        AND "id" IN (
          SELECT "yellow_card_id"
          FROM "red_card_yellow_sources"
          WHERE "red_card_id" = ${redCardId}
        )
    `;
  }

  async restoreSourceYellowsForRed(redCardId: number) {
    await this.prisma.$executeRaw`
      UPDATE "disciplinary_cards" yellow
      SET
        "active" = COALESCE(source."yellow_active_before_close", yellow."active"),
        "expires_at" = COALESCE(source."yellow_expires_at_before_close", yellow."expires_at"),
        "updated_at" = CURRENT_TIMESTAMP
      FROM "red_card_yellow_sources" source
      WHERE source."red_card_id" = ${redCardId}
        AND source."yellow_card_id" = yellow."id"
        AND source."closed_at" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "red_card_yellow_sources" other_source
          JOIN "disciplinary_cards" red
            ON red."id" = other_source."red_card_id"
          WHERE other_source."yellow_card_id" = yellow."id"
            AND other_source."red_card_id" <> ${redCardId}
            AND other_source."closed_at" IS NOT NULL
            AND red."type" = 'RED'
            AND red."active" = true
        )
    `;
  }

  async deleteRedYellowSources(redCardId: number) {
    await this.prisma.$executeRaw`
      DELETE FROM "red_card_yellow_sources"
      WHERE "red_card_id" = ${redCardId}
    `;
  }

  async deleteAutomaticRedsIssuedFromYellow(yellowCardId: number) {
    const linkedReds = await this.prisma.$queryRaw<StoredDisciplinaryCard[]>`
      SELECT
        red."id",
        red."fighter_id",
        red."tournament_id",
        red."fight_id",
        red."marshal_id",
        red."type",
        red."source",
        red."received_at",
        red."reason",
        red."expires_at",
        red."active",
        red."created_at",
        red."updated_at"
      FROM "red_card_yellow_sources" source
      JOIN "disciplinary_cards" red
        ON red."id" = source."red_card_id"
      WHERE source."yellow_card_id" = ${yellowCardId}
        AND red."type" = 'RED'
        AND red."source" = 'AUTOMATIC'
      ORDER BY red."id" ASC
    `;

    for (const red of linkedReds) {
      await this.competitionService.resetForfeitsForCard(red.id);
      await this.restoreSourceYellowsForRed(red.id);
      await this.storage.deleteCard(red.id);
      if (red.active) {
        await this.competitionService.applyRedCardForfeits(red.tournament_id);
      }
    }
  }
}
