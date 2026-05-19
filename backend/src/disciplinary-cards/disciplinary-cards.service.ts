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

interface ActiveRedCard {
  id: number;
  fighter_id: number;
  received_at: Date;
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

    const receivedAt = this.toDateOnly(dto.received_at);
    await this.validateCardTarget(
      dto.fighter_id,
      dto.tournament_id,
      dto.fight_id,
      { requireUnfinishedFight: true },
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
    const fighterId = dto.fighter_id ?? existing.fighter_id;
    const tournamentId = dto.tournament_id ?? existing.tournament_id;
    const fightId = dto.fight_id ?? existing.fight_id;
    const type = dto.type ?? existing.type;
    const receivedAt = dto.received_at
      ? this.toDateOnly(dto.received_at)
      : this.toDateOnly(existing.received_at);
    const reason = dto.reason ?? existing.reason;

    await this.validateCardTarget(fighterId, tournamentId, fightId, {
      requireUnfinishedFight: dto.fight_id !== undefined,
    });
    const expiresAt = await this.calculateExpiration(
      type,
      fighterId,
      receivedAt,
      existing.source,
    );

    await this.prisma.$executeRaw`
      UPDATE "disciplinary_cards"
      SET
        "fighter_id" = ${fighterId},
        "tournament_id" = ${tournamentId},
        "fight_id" = ${fightId},
        "type" = ${type},
        "received_at" = ${receivedAt},
        "reason" = ${reason},
        "expires_at" = ${expiresAt},
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = ${id}
    `;

    if (existing.type === CARD_RED && type !== CARD_RED) {
      await this.resetForfeitsForCard(existing.id);
      await this.applyRedCardForfeits(existing.tournament_id);
    }

    const card = await this.getStoredCard(id);
    await this.applyConsequences(card);

    return this.findOne(id);
  }

  async delete(id: number) {
    await this.ensureStorageReady();

    const card = await this.getStoredCard(id);
    await this.ensureCardCanBeDeleted(card);

    await this.prisma.$executeRaw`
      DELETE FROM "disciplinary_cards"
      WHERE "id" = ${id}
    `;

    if (card.type === CARD_RED) {
      await this.resetForfeitsForCard(card.id);
      await this.applyRedCardForfeits(card.tournament_id);
    }
  }

  async hasActiveRedForTournament(fighterId: number, tournamentId: number) {
    await this.ensureStorageReady();

    const checkDate = await this.getTournamentCheckDate(tournamentId);
    const rows = await this.prisma.$queryRaw<Array<{ id: number }>>`
      SELECT "id"
      FROM "disciplinary_cards"
      WHERE "fighter_id" = ${fighterId}
        AND "type" = 'RED'
        AND "received_at" <= ${checkDate}
        AND "expires_at" >= ${checkDate}
      LIMIT 1
    `;

    return rows.length > 0;
  }

  private async ensureStorageReady() {
    const rows = await this.prisma.$queryRaw<Array<{ table_name: string | null }>>`
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
        opponent."patronymic" AS "opponent_patronymic"
      FROM "disciplinary_cards" dc
      JOIN "fighters" card_fighter ON card_fighter."id" = dc."fighter_id"
      JOIN "tournaments" t ON t."id" = dc."tournament_id"
      JOIN "fights" f ON f."id" = dc."fight_id"
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

    await this.applyRedCardForfeits(card.tournament_id);
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

    await this.applyRedCardForfeits(redCard.tournament_id);
  }

  private async applyRedCardForfeits(tournamentId: number) {
    const checkDate = await this.getTournamentCheckDate(tournamentId);
    const fights = await this.prisma.fights.findMany({
      where: {
        tournament_id: tournamentId,
        is_finished: false,
      },
      include: {
        block: true,
        competitor1: true,
        competitor2: true,
      },
    });

    if (!fights.length) return;

    const fighterIds = [
      ...new Set(
        fights.flatMap((fight) => [
          fight.competitor1.fighter_id,
          fight.competitor2.fighter_id,
        ]),
      ),
    ];
    const activeReds = await this.getActiveRedCards(fighterIds, checkDate);
    const activeRedByFighter = new Map(
      activeReds.map((card) => [card.fighter_id, card]),
    );
    const olympicBlockIds = new Set<number>();

    for (const fight of fights) {
      const firstRed = activeRedByFighter.get(fight.competitor1.fighter_id);
      const secondRed = activeRedByFighter.get(fight.competitor2.fighter_id);
      const losingCompetitorId = this.getRedCardLosingCompetitorId({
        firstCompetitorId: fight.competitor1_id,
        secondCompetitorId: fight.competitor2_id,
        firstRed,
        secondRed,
      });

      if (!losingCompetitorId) continue;

      const firstLoses = losingCompetitorId === fight.competitor1_id;
      await this.prisma.fights.update({
        where: { id: fight.id },
        data: {
          competitor1_score: firstLoses ? 0 : 10,
          competitor2_score: firstLoses ? 10 : 0,
          winner_id: firstLoses ? fight.competitor2_id : fight.competitor1_id,
          is_finished: true,
          forfeit_card_id: firstLoses ? firstRed?.id : secondRed?.id,
        },
      });

      if (fight.block?.type === 'OLYMPIC' && fight.block_id) {
        olympicBlockIds.add(fight.block_id);
      }
    }

    for (const blockId of olympicBlockIds) {
      await this.competitionService.progressOlympicBlock(blockId);
    }
  }

  private async resetForfeitsForCard(cardId: number) {
    await this.prisma.fights.updateMany({
      where: { forfeit_card_id: cardId },
      data: {
        competitor1_score: 0,
        competitor2_score: 0,
        winner_id: null,
        is_finished: false,
        forfeit_card_id: null,
      },
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

  private getRedCardLosingCompetitorId(params: {
    firstCompetitorId: number;
    secondCompetitorId: number;
    firstRed?: ActiveRedCard;
    secondRed?: ActiveRedCard;
  }) {
    if (params.firstRed && !params.secondRed) return params.firstCompetitorId;
    if (!params.firstRed && params.secondRed) return params.secondCompetitorId;
    if (!params.firstRed || !params.secondRed) return null;

    const firstTime = params.firstRed.received_at.getTime();
    const secondTime = params.secondRed.received_at.getTime();

    if (firstTime !== secondTime) {
      return firstTime < secondTime
        ? params.firstCompetitorId
        : params.secondCompetitorId;
    }

    return params.firstRed.id <= params.secondRed.id
      ? params.firstCompetitorId
      : params.secondCompetitorId;
  }

  private async getActiveRedCards(fighterIds: number[], checkDate: Date) {
    const activeCards: ActiveRedCard[] = [];

    for (const fighterId of fighterIds) {
      const rows = await this.prisma.$queryRaw<ActiveRedCard[]>`
        SELECT
          "id",
          "fighter_id",
          "received_at"
        FROM "disciplinary_cards"
        WHERE "fighter_id" = ${fighterId}
          AND "type" = 'RED'
          AND "received_at" <= ${checkDate}
          AND "expires_at" >= ${checkDate}
        ORDER BY "received_at" ASC, "id" ASC
        LIMIT 1
      `;
      const card = rows[0];

      if (card) activeCards.push(card);
    }

    return activeCards;
  }

  private async calculateExpiration(
    type: DisciplinaryCardType,
    fighterId: number,
    receivedAt: Date,
    source: DisciplinaryCardSource,
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
