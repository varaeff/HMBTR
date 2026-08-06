import { Injectable } from '@nestjs/common';
import { SettingsService } from '../../settings/settings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DisciplinaryCardStorage } from '../cards/disciplinary-card-storage';
import {
  AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT,
  AUTO_RED_TWO_YELLOWS_SAME_TOURNAMENT,
  CARD_RED,
  SOURCE_AUTOMATIC,
} from '../disciplinary-card.constants';
import type {
  ActiveYellowCard,
  StoredDisciplinaryCard,
} from '../disciplinary-card.types';
import { DisciplinaryCardConsequencesService } from '../consequences/disciplinary-card-consequences.service';
import { DisciplinaryCardExpirationService } from '../expiration/disciplinary-card-expiration.service';
import { RedYellowSourceService } from '../red-yellow-sources/red-yellow-source.service';

@Injectable()
export class AutomaticRedCardService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private storage: DisciplinaryCardStorage,
    private expiration: DisciplinaryCardExpirationService,
    private redYellowSources: RedYellowSourceService,
    private consequences: DisciplinaryCardConsequencesService,
  ) {}

  async createAutomaticRedIfNeeded(card: StoredDisciplinaryCard) {
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
    if (isSameTournamentThreshold) {
      await this.redYellowSources.deleteInactiveCrossTournamentRedsForTournamentSourceYellows(
        card.tournament_id,
        sourceYellowIds,
      );
    }

    const redCard = await this.storage.insertCard({
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
      expiresAt: this.expiration.addDays(
        card.received_at,
        (await this.settingsService.getDisciplinaryCardSettings())
          .red_auto_yellow_days,
      ),
      active: isSameTournamentThreshold,
    });

    await this.redYellowSources.recordRedYellowSources(
      redCard.id,
      sourceYellowIds,
    );
    if (redCard.active) {
      await this.redYellowSources.closeSourceYellowsForRed(
        redCard.id,
        redCard.received_at,
      );
    }
    await this.consequences.applyRedCardConsequences(redCard);
  }

  async createInactiveCrossTournamentRedIfNeeded(
    fighterId: number,
    tournamentId: number,
    checkDate: Date,
  ) {
    const activeYellowCards = await this.getActiveYellowCards(
      fighterId,
      checkDate,
    );
    const sameTournamentYellowCards = activeYellowCards.filter(
      (yellowCard) => yellowCard.tournament_id === tournamentId,
    );

    if (activeYellowCards.length < 3 || sameTournamentYellowCards.length >= 2) {
      return;
    }

    const sourceYellowCards = activeYellowCards.slice(0, 3);
    const triggerYellow = sourceYellowCards[sourceYellowCards.length - 1];
    const [activeRedExists, inactiveAutoRedExists] = await Promise.all([
      this.prisma.$queryRaw<Array<{ id: number }>>`
        SELECT "id"
        FROM "disciplinary_cards"
        WHERE "fighter_id" = ${fighterId}
          AND "type" = 'RED'
          AND "active" = true
          AND "received_at" <= ${triggerYellow.received_at}
          AND "expires_at" >= ${triggerYellow.received_at}
        LIMIT 1
      `,
      this.prisma.$queryRaw<Array<{ id: number }>>`
        SELECT "id"
        FROM "disciplinary_cards"
        WHERE "fighter_id" = ${fighterId}
          AND "type" = 'RED'
          AND "source" = 'AUTOMATIC'
          AND "active" = false
          AND "reason" = ${AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT}
          AND "received_at" <= ${triggerYellow.received_at}
          AND "expires_at" >= ${triggerYellow.received_at}
        LIMIT 1
      `,
    ]);

    if (activeRedExists.length || inactiveAutoRedExists.length) return;

    const redCard = await this.storage.insertCard({
      fighterId,
      tournamentId: triggerYellow.tournament_id,
      fightId: triggerYellow.fight_id,
      marshalId: triggerYellow.marshal_id,
      type: CARD_RED,
      source: SOURCE_AUTOMATIC,
      receivedAt: triggerYellow.received_at,
      reason: AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT,
      expiresAt: this.expiration.addDays(
        triggerYellow.received_at,
        (await this.settingsService.getDisciplinaryCardSettings())
          .red_auto_yellow_days,
      ),
      active: false,
    });

    await this.redYellowSources.recordRedYellowSources(
      redCard.id,
      sourceYellowCards.map((yellowCard) => yellowCard.id),
    );
  }

  private async getActiveYellowCards(fighterId: number, checkDate: Date) {
    return this.prisma.$queryRaw<ActiveYellowCard[]>`
      SELECT "id", "tournament_id", "fight_id", "marshal_id", "received_at"
      FROM "disciplinary_cards"
      WHERE "fighter_id" = ${fighterId}
        AND "type" = 'YELLOW'
        AND "active" = true
        AND "received_at" <= ${checkDate}
        AND "expires_at" >= ${checkDate}
      ORDER BY "received_at" ASC, "id" ASC
    `;
  }
}
