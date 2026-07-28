import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompetitionService } from '../competition/competition.service';
import { SettingsService } from '../settings/settings.service';
import { CreateDisciplinaryCardDto } from './dto/create-disciplinary-card.dto';
import { UpdateDisciplinaryCardDto } from './dto/update-disciplinary-card.dto';

export type DisciplinaryCardType = 'YELLOW' | 'RED';
type DisciplinaryCardSource = 'MANUAL' | 'AUTOMATIC';

export interface DisciplinaryCard {
  id: number;
  fighter_id: number;
  tournament_id: number;
  fight_id: number;
  marshal_id: number;
  type: DisciplinaryCardType;
  source: DisciplinaryCardSource;
  received_at: Date;
  reason: string;
  expires_at: Date;
  expires_at_locked: boolean;
  active: boolean;
  created_at: Date;
  updated_at: Date;
  fight_number: number;
  fight_stage: number;
  tournament_name: string;
  nomination_id: number;
  nomination_name_ru: string;
  nomination_name_en: string;
  bracket_round: number | null;
  bracket_position: number | null;
  is_bronze: boolean;
  group_name: string | null;
  opponent_id: number;
  fighter_name: string;
  fighter_surname: string;
  fighter_patronymic: string | null;
  opponent_name: string;
  opponent_surname: string;
  opponent_patronymic: string | null;
  marshal_name: string;
  marshal_surname: string;
  marshal_patronymic: string | null;
  can_manage: boolean;
  can_change_result_fields: boolean;
  can_delete: boolean;
}

interface CardFightLockState {
  fight_locked: boolean;
  results_fixed: boolean;
}

interface StoredDisciplinaryCard {
  id: number;
  fighter_id: number;
  tournament_id: number;
  fight_id: number;
  marshal_id: number;
  type: DisciplinaryCardType;
  source: DisciplinaryCardSource;
  received_at: Date;
  reason: string;
  expires_at: Date;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface ActiveYellowCard {
  id: number;
  tournament_id: number;
}

const CARD_YELLOW: DisciplinaryCardType = 'YELLOW';
const CARD_RED: DisciplinaryCardType = 'RED';
const SOURCE_MANUAL: DisciplinaryCardSource = 'MANUAL';
const SOURCE_AUTOMATIC: DisciplinaryCardSource = 'AUTOMATIC';
const AUTO_RED_TWO_YELLOWS_SAME_TOURNAMENT =
  'AUTO_RED_TWO_YELLOWS_SAME_TOURNAMENT';
const AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT =
  'AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT';

@Injectable()
export class DisciplinaryCardsService {
  constructor(
    private prisma: PrismaService,
    private competitionService: CompetitionService,
    private settingsService: SettingsService,
  ) {}

  async findByFighter(fighterId: number) {
    await this.ensureStorageReady();

    return this.findCards({ fighterId });
  }

  async findByTournament(tournamentId: number) {
    await this.ensureStorageReady();

    return this.findCards({ tournamentId });
  }

  async create(dto: CreateDisciplinaryCardDto) {
    await this.ensureStorageReady();
    await this.competitionService.assertFightLifecycleEditable(dto.fight_id);

    const receivedAt = this.toDateOnly(dto.received_at);
    await this.validateCardTarget(
      dto.fighter_id,
      dto.tournament_id,
      dto.fight_id,
      { requireUnfinishedFight: false },
    );
    await this.validateTournamentMarshal(dto.tournament_id, dto.marshal_id);
    const card = await this.insertCard({
      fighterId: dto.fighter_id,
      tournamentId: dto.tournament_id,
      fightId: dto.fight_id,
      marshalId: dto.marshal_id,
      type: dto.type,
      source: SOURCE_MANUAL,
      receivedAt,
      reason: dto.reason,
      expiresAt: await this.calculateExpiration(
        dto.type,
        dto.fighter_id,
        receivedAt,
        SOURCE_MANUAL,
      ),
      active: true,
    });

    await this.applyConsequences(card);

    return this.findOne(card.id);
  }

  async update(id: number, dto: UpdateDisciplinaryCardDto) {
    await this.ensureStorageReady();

    const existing = await this.getStoredCard(id);
    const lockState = await this.getCardFightLockState(existing.fight_id);
    if (
      existing.source === SOURCE_AUTOMATIC &&
      dto.reason !== undefined
    ) {
      throw new BadRequestException('Automatic card reason cannot be edited');
    }
    if (
      existing.source === SOURCE_AUTOMATIC &&
      dto.type !== undefined
    ) {
      throw new BadRequestException('Automatic card type cannot be edited');
    }
    if (
      existing.source === SOURCE_AUTOMATIC &&
      dto.marshal_id !== undefined
    ) {
      throw new BadRequestException('Automatic card marshal cannot be edited');
    }
    if (
      existing.source === SOURCE_AUTOMATIC &&
      dto.active !== undefined
    ) {
      throw new BadRequestException('Automatic card active flag cannot be edited');
    }
    const type = dto.type ?? existing.type;
    const reason = dto.reason ?? existing.reason;
    const marshalId = dto.marshal_id ?? existing.marshal_id;
    const marshalChanged = marshalId !== existing.marshal_id;
    if (dto.marshal_id !== undefined && dto.marshal_id !== existing.marshal_id) {
      await this.validateTournamentMarshal(
        existing.tournament_id,
        dto.marshal_id,
      );
    }
    if (
      existing.type === CARD_YELLOW &&
      dto.expires_at !== undefined &&
      (await this.isYellowExpirationLocked(existing.id))
    ) {
      throw new BadRequestException('Yellow card expiration is locked');
    }
    const resultFieldsChanged =
      (dto.type !== undefined && dto.type !== existing.type) ||
      (dto.active !== undefined && dto.active !== existing.active);
    if (
      (lockState.fight_locked || lockState.results_fixed) &&
      resultFieldsChanged
    ) {
      throw new BadRequestException(
        'Card result-affecting fields are fixed',
      );
    }
    if (existing.type === CARD_RED && existing.active && dto.active === false) {
      throw new BadRequestException('Active red card cannot be deactivated');
    }
    const active =
      type === CARD_YELLOW
        ? existing.type === CARD_YELLOW
          ? existing.active
          : true
        : existing.type !== CARD_RED
          ? true
          : (dto.active ?? existing.active);
    const expiresAt = dto.expires_at
      ? this.toDateOnly(dto.expires_at)
      : type !== existing.type
        ? await this.calculateExpiration(
            type,
            existing.fighter_id,
            existing.received_at,
            existing.source,
            existing.id,
          )
        : this.toDateOnly(existing.expires_at);
    const activatesInactiveRed =
      existing.type === CARD_RED &&
      !existing.active &&
      type === CARD_RED &&
      active;

    await this.prisma.$executeRaw`
      UPDATE "disciplinary_cards"
      SET
        "reason" = ${reason},
        "type" = ${type},
        "marshal_id" = ${marshalId},
        "active" = ${active},
        "expires_at" = ${expiresAt},
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = ${id}
    `;

    if (existing.type === CARD_RED && !lockState.results_fixed) {
      await this.competitionService.resetEditableForfeitsForCard(existing.id);
    }

    const updated = await this.getStoredCard(id);
    if (existing.type === CARD_YELLOW && marshalChanged) {
      await this.updateAutomaticRedMarshalFromTriggerYellow(updated);
    }
    if (existing.type === CARD_RED && updated.type !== CARD_RED) {
      await this.restoreSourceYellowsForRed(existing.id);
      await this.deleteRedYellowSources(existing.id);
    }
    if (activatesInactiveRed) {
      await this.closeSourceYellowsForRed(
        updated.id,
        this.toDateOnly(new Date()),
      );
    }
    if (updated.type !== existing.type) {
      await this.applyConsequences(updated);
    } else if (
      updated.type === CARD_RED &&
      updated.active &&
      !lockState.results_fixed
    ) {
      await this.competitionService.applyRedCardConsequences(
        existing.tournament_id,
      );
    }

    return this.findOne(id);
  }

  async delete(id: number) {
    await this.ensureStorageReady();

    const card = await this.getStoredCard(id);
    await this.competitionService.assertFightLifecycleEditable(card.fight_id);
    await this.ensureCardCanBeDeleted(card);
    if (card.source === SOURCE_AUTOMATIC) {
      throw new BadRequestException(
        'Automatic card cannot be deleted manually',
      );
    }

    if (card.type === CARD_RED) {
      await this.competitionService.resetForfeitsForCard(card.id);
      await this.restoreSourceYellowsForRed(card.id);
    } else {
      await this.deleteAutomaticRedsIssuedFromYellow(card.id);
    }

    await this.prisma.$executeRaw`
      DELETE FROM "disciplinary_cards"
      WHERE "id" = ${id}
    `;

    if (card.type === CARD_RED) {
      await this.competitionService.applyRedCardForfeits(card.tournament_id);
    }
  }

  async hasActiveRedForTournament(fighterId: number, tournamentId: number) {
    const fighterIds =
      await this.getActiveRedFighterIdsForTournament(tournamentId);

    return fighterIds.includes(fighterId);
  }

  async getActiveRedFighterIdsForTournament(tournamentId: number) {
    await this.ensureStorageReady();

    const checkDate = await this.getTournamentCheckDate(tournamentId);
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

  private async ensureStorageReady() {
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

  private async findOne(id: number) {
    const rows = await this.findCards({ cardId: id });
    const card = rows[0];

    if (!card) throw new NotFoundException('Disciplinary card not found');

    return card;
  }

  private async findCards(filter: {
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

  private async getStoredCard(id: number) {
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

  private async validateCardTarget(
    fighterId: number,
    tournamentId: number,
    fightId: number,
    options: { requireUnfinishedFight: boolean } = {
      requireUnfinishedFight: false,
    },
  ) {
    const fight = await this.prisma.fights.findUnique({
      where: { id: fightId },
      include: {
        competitor1: true,
        competitor2: true,
      },
    });

    if (!fight) throw new NotFoundException('Fight not found');
    if (options.requireUnfinishedFight && fight.is_finished) {
      throw new BadRequestException(
        'Cannot issue a card for a fight with recorded result',
      );
    }
    if (fight.tournament_id !== tournamentId) {
      throw new BadRequestException('Fight does not belong to tournament');
    }

    const fightFighterIds = [
      fight.competitor1.fighter_id,
      fight.competitor2.fighter_id,
    ];

    if (!fightFighterIds.includes(fighterId)) {
      throw new BadRequestException('Fighter does not belong to fight');
    }
  }

  private async getCardFightLockState(fightId: number) {
    const rows = await this.prisma.$queryRaw<CardFightLockState[]>`
      SELECT
        (
          cb."status" <> 'ACTIVE'
          OR tn."is_finished" = true
        ) AS "fight_locked",
        (
          CASE
            WHEN cb."type" = 'GROUP' THEN cb."lifecycle_state" = 'RESULTS_FIXED'
            ELSE EXISTS (
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
          END
        ) AS "results_fixed"
      FROM "fights" f
      JOIN "competition_blocks" cb ON cb."id" = f."block_id"
      JOIN "tournament_nominations" tn ON tn."id" = cb."tournament_nomination_id"
      WHERE f."id" = ${fightId}
      LIMIT 1
    `;
    const state = rows[0];

    if (!state) throw new NotFoundException('Fight not found');

    return state;
  }

  private async isYellowExpirationLocked(yellowCardId: number) {
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

  private async updateAutomaticRedMarshalFromTriggerYellow(
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

  private async validateTournamentMarshal(
    tournamentId: number,
    marshalId: number,
  ) {
    const tournamentMarshal = await this.prisma.tournament_marshals.findFirst({
      where: {
        tournament_id: tournamentId,
        marshal_id: marshalId,
      },
      select: { id: true },
    });

    if (!tournamentMarshal) {
      throw new BadRequestException('Marshal is not registered for tournament');
    }
  }

  private async insertCard(params: {
    fighterId: number;
    tournamentId: number;
    fightId: number;
    marshalId: number;
    type: DisciplinaryCardType;
    source: DisciplinaryCardSource;
    receivedAt: Date;
    reason: string;
    expiresAt: Date;
    active: boolean;
  }) {
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

  private async applyConsequences(card: StoredDisciplinaryCard) {
    if (card.type === CARD_YELLOW) {
      await this.createAutomaticRedIfNeeded(card);
      return;
    }

    if (!card.active) return;
    await this.removeUnformedOtherNominationCompetitors(card);
    await this.competitionService.applyRedCardConsequences(card.tournament_id);
  }

  private async createAutomaticRedIfNeeded(card: StoredDisciplinaryCard) {
    const activeYellowCards = await this.getActiveYellowCards(
      card.fighter_id,
      card.received_at,
    );
    const sameTournamentYellowCards = activeYellowCards.filter(
      (yellowCard) => yellowCard.tournament_id === card.tournament_id,
    );

    if (sameTournamentYellowCards.length < 2 && activeYellowCards.length < 3) {
      return;
    }
    const isSameTournamentThreshold = sameTournamentYellowCards.length >= 2;
    const isCrossTournamentThreshold = activeYellowCards.length >= 3;
    const sourceYellowIds = (
      isSameTournamentThreshold
        ? sameTournamentYellowCards.slice(0, 2)
        : activeYellowCards.slice(0, 3)
    ).map((yellowCard) => yellowCard.id);

    const activeRedExists = await this.prisma.$queryRaw<Array<{ id: number }>>`
      SELECT "id"
      FROM "disciplinary_cards"
      WHERE "fighter_id" = ${card.fighter_id}
        AND "type" = 'RED'
        AND "active" = true
        AND "received_at" <= ${card.received_at}
        AND "expires_at" >= ${card.received_at}
      LIMIT 1
    `;

    if (activeRedExists.length) return;

    if (!isSameTournamentThreshold && isCrossTournamentThreshold) {
      const inactiveAutoRedExists = await this.prisma.$queryRaw<
        Array<{ id: number }>
      >`
        SELECT "id"
        FROM "disciplinary_cards"
        WHERE "fighter_id" = ${card.fighter_id}
          AND "type" = 'RED'
          AND "source" = 'AUTOMATIC'
          AND "active" = false
          AND "reason" = ${AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT}
          AND "received_at" <= ${card.received_at}
          AND "expires_at" >= ${card.received_at}
        LIMIT 1
      `;

      if (inactiveAutoRedExists.length) return;
    }

    const redCard = await this.insertCard({
      fighterId: card.fighter_id,
      tournamentId: card.tournament_id,
      fightId: card.fight_id,
      marshalId: card.marshal_id,
      type: CARD_RED,
      source: SOURCE_AUTOMATIC,
      receivedAt: card.received_at,
      reason: isSameTournamentThreshold
        ? AUTO_RED_TWO_YELLOWS_SAME_TOURNAMENT
        : AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT,
      expiresAt: this.addDays(
        card.received_at,
        (await this.settingsService.getDisciplinaryCardSettings())
          .red_auto_yellow_days,
      ),
      active: isSameTournamentThreshold,
    });

    await this.recordRedYellowSources(redCard.id, sourceYellowIds);
    if (redCard.active) {
      await this.closeSourceYellowsForRed(redCard.id, redCard.received_at);
    }
    await this.applyConsequences(redCard);
  }

  private async getActiveYellowCards(fighterId: number, checkDate: Date) {
    return this.prisma.$queryRaw<ActiveYellowCard[]>`
      SELECT "id", "tournament_id"
      FROM "disciplinary_cards"
      WHERE "fighter_id" = ${fighterId}
        AND "type" = 'YELLOW'
        AND "active" = true
        AND "received_at" <= ${checkDate}
        AND "expires_at" >= ${checkDate}
      ORDER BY "received_at" ASC, "id" ASC
    `;
  }

  private async recordRedYellowSources(
    redCardId: number,
    yellowCardIds: number[],
  ) {
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

  private async closeSourceYellowsForRed(redCardId: number, closedAt: Date) {
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

  private async restoreSourceYellowsForRed(redCardId: number) {
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

  private async deleteRedYellowSources(redCardId: number) {
    await this.prisma.$executeRaw`
      DELETE FROM "red_card_yellow_sources"
      WHERE "red_card_id" = ${redCardId}
    `;
  }

  private async deleteAutomaticRedsIssuedFromYellow(yellowCardId: number) {
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
      await this.prisma.$executeRaw`
        DELETE FROM "disciplinary_cards"
        WHERE "id" = ${red.id}
      `;
      if (red.active) {
        await this.competitionService.applyRedCardForfeits(red.tournament_id);
      }
    }
  }

  private async removeUnformedOtherNominationCompetitors(
    card: StoredDisciplinaryCard,
  ) {
    const sourceFight = await this.prisma.fights.findUnique({
      where: { id: card.fight_id },
      select: { nomination_id: true },
    });

    if (!sourceFight) throw new NotFoundException('Fight not found');

    const competitors = await this.prisma.competitors.findMany({
      where: {
        fighter_id: card.fighter_id,
        tournament_id: card.tournament_id,
        nomination_id: { not: sourceFight.nomination_id },
      },
      select: {
        id: true,
        nomination_id: true,
      },
    });

    if (!competitors.length) return;

    const nominationIds = [
      ...new Set(competitors.map((competitor) => competitor.nomination_id)),
    ];
    const formedBlocks = await this.prisma.competition_blocks.findMany({
      where: {
        tournament_id: card.tournament_id,
        nomination_id: { in: nominationIds },
      },
      select: { nomination_id: true },
    });
    const formedNominationIds = new Set(
      formedBlocks.map((block) => block.nomination_id),
    );
    const removableCompetitorIds = competitors
      .filter(
        (competitor) => !formedNominationIds.has(competitor.nomination_id),
      )
      .map((competitor) => competitor.id);

    if (!removableCompetitorIds.length) return;

    await this.prisma.competitors.deleteMany({
      where: { id: { in: removableCompetitorIds } },
    });
  }

  private async ensureCardCanBeDeleted(card: StoredDisciplinaryCard) {
    const fight = await this.prisma.fights.findUnique({
      where: { id: card.fight_id },
      include: {
        block: {
          include: {
            tournament_nomination: true,
          },
        },
      },
    });

    if (!fight) throw new NotFoundException('Fight not found');
    if (
      fight.block?.status !== 'ACTIVE' ||
      fight.block.tournament_nomination.is_finished
    ) {
      throw new BadRequestException(
        'Cannot delete a card after this stage is completed',
      );
    }
  }

  private async calculateExpiration(
    type: DisciplinaryCardType,
    fighterId: number,
    receivedAt: Date,
    source: DisciplinaryCardSource,
    excludeCardId: number | null = null,
  ) {
    const settings = await this.settingsService.getDisciplinaryCardSettings();

    if (type === CARD_YELLOW) {
      if (settings.yellow_expiration_mode === 'DAYS') {
        return this.addDays(receivedAt, settings.yellow_expiration_days);
      }

      return this.lastDayOfExpirationMonth(
        receivedAt,
        settings.yellow_expiration_month,
      );
    }

    if (source === SOURCE_AUTOMATIC) {
      return this.addDays(receivedAt, settings.red_auto_yellow_days);
    }

    const activeYellowRows = await this.prisma.$queryRaw<Array<{ id: number }>>`
      SELECT "id"
      FROM "disciplinary_cards"
      WHERE "fighter_id" = ${fighterId}
        AND "type" = 'YELLOW'
        AND "active" = true
        AND (${excludeCardId}::int IS NULL OR "id" <> ${excludeCardId}::int)
        AND "received_at" <= ${receivedAt}
        AND "expires_at" >= ${receivedAt}
    `;

    if (activeYellowRows.length >= 2) {
      return this.addDays(
        receivedAt,
        settings.red_manual_with_two_or_more_yellows_days,
      );
    }
    if (activeYellowRows.length === 1) {
      return this.addDays(receivedAt, settings.red_manual_with_one_yellow_days);
    }

    return this.addDays(receivedAt, settings.red_manual_days);
  }

  private async getTournamentCheckDate(tournamentId: number) {
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

  private addDays(date: Date, days: number) {
    const result = this.toDateOnly(date);
    result.setUTCDate(result.getUTCDate() + days);

    return result;
  }

  private lastDayOfExpirationMonth(date: Date, month: number) {
    const receivedAt = this.toDateOnly(date);
    const expirationMonthIndex = month - 1;
    let year = receivedAt.getUTCFullYear();
    const buildExpiration = () =>
      new Date(Date.UTC(year, expirationMonthIndex + 1, 0));
    let expiration = buildExpiration();

    if (expiration.getTime() < receivedAt.getTime()) {
      year++;
      expiration = buildExpiration();
    }

    return expiration;
  }
}
