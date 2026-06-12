import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompetitionService } from '../competition/competition.service';
import { CreateDisciplinaryCardDto } from './dto/create-disciplinary-card.dto';
import { UpdateDisciplinaryCardDto } from './dto/update-disciplinary-card.dto';

export type DisciplinaryCardType = 'YELLOW' | 'RED';
type DisciplinaryCardSource = 'MANUAL' | 'AUTOMATIC';

export interface DisciplinaryCard {
  id: number;
  fighter_id: number;
  tournament_id: number;
  fight_id: number;
  type: DisciplinaryCardType;
  source: DisciplinaryCardSource;
  received_at: Date;
  reason: string;
  expires_at: Date;
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
  can_manage: boolean;
  can_delete: boolean;
}

interface StoredDisciplinaryCard {
  id: number;
  fighter_id: number;
  tournament_id: number;
  fight_id: number;
  type: DisciplinaryCardType;
  source: DisciplinaryCardSource;
  received_at: Date;
  reason: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

const CARD_YELLOW: DisciplinaryCardType = 'YELLOW';
const CARD_RED: DisciplinaryCardType = 'RED';
const SOURCE_MANUAL: DisciplinaryCardSource = 'MANUAL';
const SOURCE_AUTOMATIC: DisciplinaryCardSource = 'AUTOMATIC';

@Injectable()
export class DisciplinaryCardsService {
  constructor(
    private prisma: PrismaService,
    private competitionService: CompetitionService,
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
    const card = await this.insertCard({
      fighterId: dto.fighter_id,
      tournamentId: dto.tournament_id,
      fightId: dto.fight_id,
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
    });

    await this.applyConsequences(card);

    return this.findOne(card.id);
  }

  async update(id: number, dto: UpdateDisciplinaryCardDto) {
    await this.ensureStorageReady();

    const existing = await this.getStoredCard(id);
    await this.competitionService.assertFightLifecycleEditable(
      existing.fight_id,
    );
    const type = dto.type ?? existing.type;
    const reason = dto.reason ?? existing.reason;
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

    await this.prisma.$executeRaw`
      UPDATE "disciplinary_cards"
      SET
        "reason" = ${reason},
        "type" = ${type},
        "expires_at" = ${expiresAt},
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = ${id}
    `;

    if (existing.type === CARD_RED) {
      await this.competitionService.resetForfeitsForCard(existing.id);
    }

    const updated = await this.getStoredCard(id);
    if (updated.type !== existing.type) {
      await this.applyConsequences(updated);
    } else if (updated.type === CARD_RED) {
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

    await this.prisma.$executeRaw`
      DELETE FROM "disciplinary_cards"
      WHERE "id" = ${id}
    `;

    if (card.type === CARD_RED) {
      await this.competitionService.resetForfeitsForCard(card.id);
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
        AND "received_at" <= ${checkDate}
        AND "expires_at" >= ${checkDate}
    `;

    return rows.map((row) => row.fighter_id);
  }

  private async ensureStorageReady() {
    const rows = await this.prisma.$queryRaw<
      Array<{ table_name: string | null }>
    >`
      SELECT to_regclass('public.disciplinary_cards')::text AS "table_name"
    `;

    if (!rows[0]?.table_name) {
      throw new BadRequestException(
        'Disciplinary card storage is not ready. Run the 3_disciplinary_cards Prisma migration.',
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
        dc."type",
        dc."source",
        dc."received_at",
        dc."reason",
        dc."expires_at",
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
        ) AS "can_manage",
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
        ) AS "can_delete"
      FROM "disciplinary_cards" dc
      JOIN "fighters" card_fighter ON card_fighter."id" = dc."fighter_id"
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
        "type",
        "source",
        "received_at",
        "reason",
        "expires_at",
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

  private async insertCard(params: {
    fighterId: number;
    tournamentId: number;
    fightId: number;
    type: DisciplinaryCardType;
    source: DisciplinaryCardSource;
    receivedAt: Date;
    reason: string;
    expiresAt: Date;
  }) {
    const rows = await this.prisma.$queryRaw<StoredDisciplinaryCard[]>`
      INSERT INTO "disciplinary_cards"
        (
          "fighter_id",
          "tournament_id",
          "fight_id",
          "type",
          "source",
          "received_at",
          "reason",
          "expires_at",
          "created_at",
          "updated_at"
        )
      VALUES
        (
          ${params.fighterId},
          ${params.tournamentId},
          ${params.fightId},
          ${params.type},
          ${params.source},
          ${params.receivedAt},
          ${params.reason},
          ${params.expiresAt},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      RETURNING
        "id",
        "fighter_id",
        "tournament_id",
        "fight_id",
        "type",
        "source",
        "received_at",
        "reason",
        "expires_at",
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

    await this.removeUnformedOtherNominationCompetitors(card);
    await this.competitionService.applyRedCardConsequences(card.tournament_id);
  }

  private async createAutomaticRedIfNeeded(card: StoredDisciplinaryCard) {
    const activeYellowCounts = await this.prisma.$queryRaw<
      Array<{ total_count: bigint; tournament_count: bigint }>
    >`
      SELECT
        COUNT(*) AS "total_count",
        COUNT(*) FILTER (WHERE "tournament_id" = ${card.tournament_id}) AS "tournament_count"
      FROM "disciplinary_cards"
      WHERE "fighter_id" = ${card.fighter_id}
        AND "type" = 'YELLOW'
        AND "received_at" <= ${card.received_at}
        AND "expires_at" >= ${card.received_at}
    `;
    const counts = activeYellowCounts[0];

    if (
      Number(counts?.tournament_count ?? 0) < 2 &&
      Number(counts?.total_count ?? 0) < 3
    ) {
      return;
    }

    const activeRedExists = await this.prisma.$queryRaw<Array<{ id: number }>>`
      SELECT "id"
      FROM "disciplinary_cards"
      WHERE "fighter_id" = ${card.fighter_id}
        AND "type" = 'RED'
        AND "received_at" <= ${card.received_at}
        AND "expires_at" >= ${card.received_at}
      LIMIT 1
    `;

    if (activeRedExists.length) return;

    const redCard = await this.insertCard({
      fighterId: card.fighter_id,
      tournamentId: card.tournament_id,
      fightId: card.fight_id,
      type: CARD_RED,
      source: SOURCE_AUTOMATIC,
      receivedAt: card.received_at,
      reason: 'Automatic red card: active yellow card threshold reached',
      expiresAt: this.addDays(card.received_at, 45),
    });

    await this.applyConsequences(redCard);
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
    if (type === CARD_YELLOW) {
      return new Date(Date.UTC(receivedAt.getUTCFullYear(), 11, 31));
    }

    if (source === SOURCE_AUTOMATIC) {
      return this.addDays(receivedAt, 45);
    }

    const activeYellowRows = await this.prisma.$queryRaw<Array<{ id: number }>>`
      SELECT "id"
      FROM "disciplinary_cards"
      WHERE "fighter_id" = ${fighterId}
        AND "type" = 'YELLOW'
        AND (${excludeCardId}::int IS NULL OR "id" <> ${excludeCardId}::int)
        AND "received_at" <= ${receivedAt}
        AND "expires_at" >= ${receivedAt}
      LIMIT 1
    `;

    return this.addDays(receivedAt, activeYellowRows.length ? 120 : 90);
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
}
