import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { DisciplinaryCard } from '../disciplinary-card.types';

@Injectable()
export class DisciplinaryCardReader {
  constructor(private prisma: PrismaService) {}

  async findOne(id: number) {
    const rows = await this.findCards({ cardId: id });
    const card = rows[0];

    if (!card) throw new NotFoundException('Disciplinary card not found');

    return card;
  }

  async findCards(filter: {
    cardId?: number;
    fighterId?: number;
    tournamentId?: number;
  }) {
    const cardId = filter.cardId ?? null;
    const fighterId = filter.fighterId ?? null;
    const tournamentId = filter.tournamentId ?? null;

    return this.prisma.$queryRaw<DisciplinaryCard[]>`
      SELECT
        dc."id",
        dc."fighter_id",
        dc."tournament_id",
        dc."fight_id",
        dc."marshal_id",
        dc."type",
        dc."source",
        dc."received_at",
        dc."reason",
        dc."expires_at",
        EXISTS (
          SELECT 1
          FROM "red_card_yellow_sources" source
          JOIN "disciplinary_cards" source_red
            ON source_red."id" = source."red_card_id"
          WHERE source."yellow_card_id" = dc."id"
            AND source."closed_at" IS NOT NULL
            AND source_red."type" = 'RED'
            AND source_red."source" = 'AUTOMATIC'
        ) AS "expires_at_locked",
        dc."active",
        dc."created_at",
        dc."updated_at",
        f."fight_number",
        f."stage" AS "fight_stage",
        t."name" AS "tournament_name",
        f."nomination_id",
        n."name_ru" AS "nomination_name_ru",
        n."name_en" AS "nomination_name_en",
        f."bracket_round",
        f."bracket_position",
        f."is_bronze",
        g."name" AS "group_name",
        opponent."id" AS "opponent_id",
        card_fighter."name" AS "fighter_name",
        card_fighter."surname" AS "fighter_surname",
        card_fighter."patronymic" AS "fighter_patronymic",
        opponent."name" AS "opponent_name",
        opponent."surname" AS "opponent_surname",
        opponent."patronymic" AS "opponent_patronymic",
        marshal."name" AS "marshal_name",
        marshal."surname" AS "marshal_surname",
        marshal."patronymic" AS "marshal_patronymic",
        true AS "can_manage",
        (
          cb."status" = 'ACTIVE'
          AND tn."is_finished" = false
          AND (
            (
              cb."type" = 'GROUP'
              AND cb."lifecycle_state" <> 'RESULTS_FIXED'
            )
            OR
            (
              cb."type" = 'OLYMPIC'
              AND NOT EXISTS (
                SELECT 1
                FROM "competition_round_states" crs
                WHERE crs."block_id" = cb."id"
                  AND crs."results_fixed" = true
                  AND (
                    crs."round" = f."bracket_round"
                    OR (
                      f."is_bronze" = true
                      AND crs."round" = (
                        SELECT MAX(final_state."round")
                        FROM "competition_round_states" final_state
                        WHERE final_state."block_id" = cb."id"
                      )
                    )
                  )
              )
            )
          )
        ) AS "can_change_result_fields",
        (
          dc."source" <> 'AUTOMATIC'
          AND cb."status" = 'ACTIVE'
          AND tn."is_finished" = false
          AND (
            (
              cb."type" = 'GROUP'
              AND cb."lifecycle_state" <> 'RESULTS_FIXED'
            )
            OR
            (
              cb."type" = 'OLYMPIC'
              AND NOT EXISTS (
                SELECT 1
                FROM "competition_round_states" crs
                WHERE crs."block_id" = cb."id"
                  AND crs."results_fixed" = true
                  AND (
                    crs."round" = f."bracket_round"
                    OR (
                      f."is_bronze" = true
                      AND crs."round" = (
                        SELECT MAX(final_state."round")
                        FROM "competition_round_states" final_state
                        WHERE final_state."block_id" = cb."id"
                      )
                    )
                  )
              )
            )
          )
        ) AS "can_delete"
      FROM "disciplinary_cards" dc
      JOIN "fighters" card_fighter ON card_fighter."id" = dc."fighter_id"
      JOIN "marshals" marshal ON marshal."id" = dc."marshal_id"
      JOIN "tournaments" t ON t."id" = dc."tournament_id"
      JOIN "fights" f ON f."id" = dc."fight_id"
      JOIN "nominations" n ON n."id" = f."nomination_id"
      LEFT JOIN "competition_blocks" cb ON cb."id" = f."block_id"
      LEFT JOIN "tournament_nominations" tn ON tn."id" = cb."tournament_nomination_id"
      LEFT JOIN "groups" g ON g."id" = f."group_id"
      JOIN "competitors" own_competitor
        ON own_competitor."fighter_id" = dc."fighter_id"
        AND own_competitor."id" IN (f."competitor1_id", f."competitor2_id")
      JOIN "competitors" opponent_competitor
        ON opponent_competitor."id" = CASE
          WHEN own_competitor."id" = f."competitor1_id" THEN f."competitor2_id"
          ELSE f."competitor1_id"
        END
      JOIN "fighters" opponent ON opponent."id" = opponent_competitor."fighter_id"
      WHERE (${cardId}::int IS NULL OR dc."id" = ${cardId}::int)
        AND (${fighterId}::int IS NULL OR dc."fighter_id" = ${fighterId}::int)
        AND (${tournamentId}::int IS NULL OR dc."tournament_id" = ${tournamentId}::int)
      ORDER BY dc."received_at" DESC, dc."id" DESC
    `;
  }
}
