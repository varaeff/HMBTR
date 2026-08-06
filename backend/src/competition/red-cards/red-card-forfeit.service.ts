import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { emptyFightScoreData } from '../competition.helpers';
import type { ActiveRedCard, PrismaTx } from '../competition-internal.types';
import { CompetitionScoringService } from '../scoring/competition-scoring.service';
import {
  AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT,
} from '../../disciplinary-cards/disciplinary-card.constants';
import {
  canApplyRedCardForfeitToFight,
  getApplicableRedForFight,
  getRedCardLosingCompetitorId,
} from './red-card-policy';
import { RedCardStorageService } from './red-card-storage.service';

@Injectable()
export class RedCardForfeitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: CompetitionScoringService,
    private readonly storageService: RedCardStorageService,
  ) {}

  async applyRedCardForfeitsPass(tournamentId: number, checkDate: Date) {
    const fights = await this.prisma.fights.findMany({
      where: {
        tournament_id: tournamentId,
      },
      include: {
        block: {
          include: {
            tournament_nomination: true,
            round_states: true,
          },
        },
        competitor1: true,
        competitor2: true,
        nomination: true,
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
    const activeReds = await this.storageService.getActiveRedCards(
      fighterIds,
      checkDate,
    );
    const activeRedsByFighter = new Map<number, ActiveRedCard[]>();
    for (const card of activeReds) {
      const fighterCards = activeRedsByFighter.get(card.fighter_id) ?? [];
      fighterCards.push(card);
      activeRedsByFighter.set(card.fighter_id, fighterCards);
    }
    for (const fight of fights) {
      if (!canApplyRedCardForfeitToFight(fight)) continue;

      const firstReds = activeRedsByFighter.get(fight.competitor1.fighter_id);
      const secondReds = activeRedsByFighter.get(fight.competitor2.fighter_id);
      const firstApplicableRed = getApplicableRedForFight(
        fight,
        firstReds ?? [],
      );
      const secondApplicableRed = getApplicableRedForFight(
        fight,
        secondReds ?? [],
      );
      const losingCompetitorId = getRedCardLosingCompetitorId({
        firstCompetitorId: fight.competitor1_id,
        secondCompetitorId: fight.competitor2_id,
        firstRed: firstApplicableRed,
        secondRed: secondApplicableRed,
      });

      if (!losingCompetitorId) continue;

      const firstLoses = losingCompetitorId === fight.competitor1_id;
      const forfeitRoundScores =
        this.scoringService.getRedCardForfeitRoundScores(
          fight.rounds,
          fight.round_win,
          firstLoses,
        );
      await this.prisma.fights.update({
        where: { id: fight.id },
        data: {
          ...this.scoringService.getRedCardForfeitScoreData(
            fight.rounds,
            fight.round_win,
            firstLoses,
          ),
          winner_id: firstLoses ? fight.competitor2_id : fight.competitor1_id,
          is_finished: true,
          forfeit_card_id: firstLoses
            ? firstApplicableRed?.id
            : secondApplicableRed?.id,
        },
      });
      await this.scoringService.replaceFightRoundScores(
        fight.id,
        forfeitRoundScores,
      );
    }
  }

  async resetForfeitsForCard(cardId: number) {
    const fights = await this.prisma.fights.findMany({
      where: { forfeit_card_id: cardId },
      select: { id: true },
    });
    await this.prisma.fights.updateMany({
      where: { forfeit_card_id: cardId },
      data: emptyFightScoreData,
    });
    if (fights.length) {
      await this.prisma.fight_round_scores.deleteMany({
        where: { fight_id: { in: fights.map((fight) => fight.id) } },
      });
    }
  }

  async resetEditableForfeitsForCard(cardId: number) {
    const fights = await this.prisma.fights.findMany({
      where: { forfeit_card_id: cardId },
      include: {
        block: {
          include: {
            tournament_nomination: true,
            round_states: true,
          },
        },
      },
    });
    const editableFightIds = fights
      .filter((fight) => canApplyRedCardForfeitToFight(fight))
      .map((fight) => fight.id);

    if (!editableFightIds.length) return;

    await this.prisma.fights.updateMany({
      where: { id: { in: editableFightIds } },
      data: emptyFightScoreData,
    });
    await this.prisma.fight_round_scores.deleteMany({
      where: { fight_id: { in: editableFightIds } },
    });
  }

  async resetForfeitsForDeletedFightsTx(
    tx: PrismaTx,
    blockId: number,
    round?: number,
  ) {
    const fights = await tx.fights.findMany({
      where: {
        block_id: blockId,
        ...(round === undefined
          ? {}
          : {
              OR: [
                { bracket_round: round },
                { is_bronze: true, bracket_round: { gte: round } },
              ],
            }),
      },
      select: { id: true },
    });
    if (!fights.length) return;
    const attachedCards = await tx.disciplinary_cards.findMany({
      where: { fight_id: { in: fights.map((fight) => fight.id) } },
      select: {
        id: true,
        fighter_id: true,
        tournament_id: true,
        type: true,
        source: true,
        reason: true,
        received_at: true,
      },
    });
    if (!attachedCards.length) return;

    const linkedAutomaticReds =
      await this.getAutomaticRedsLinkedToDeletedYellowsTx(
        tx,
        attachedCards
          .filter((card) => card.type === 'YELLOW')
          .map((card) => card.id),
      );
    const cardsById = new Map(
      [...attachedCards, ...linkedAutomaticReds].map((card) => [card.id, card]),
    );
    const cards = [...cardsById.values()];
    const cardIds = cards.map((card) => card.id);
    const redCardIds = cards
      .filter((card) => card.type === 'RED')
      .map((card) => card.id);
    const affectedContexts = this.getAffectedAutomaticRedContexts(cards);

    const affectedFights = await tx.fights.findMany({
      where: { forfeit_card_id: { in: cardIds } },
      select: { id: true },
    });
    await tx.fights.updateMany({
      where: { forfeit_card_id: { in: cardIds } },
      data: emptyFightScoreData,
    });
    if (affectedFights.length) {
      await tx.fight_round_scores.deleteMany({
        where: { fight_id: { in: affectedFights.map((fight) => fight.id) } },
      });
    }
    if (redCardIds.length) {
      await this.restoreSourceYellowsForDeletedRedsTx(tx, redCardIds);
    }
    await tx.disciplinary_cards.deleteMany({
      where: { id: { in: cardIds } },
    });
    await this.recreateInactiveCrossTournamentRedsTx(tx, affectedContexts);
  }

  private async getAutomaticRedsLinkedToDeletedYellowsTx(
    tx: PrismaTx,
    yellowCardIds: number[],
  ) {
    if (!yellowCardIds.length) return [];

    return tx.$queryRaw<
      Array<{
        id: number;
        fighter_id: number;
        tournament_id: number;
        type: string;
        source: string;
        reason: string;
        received_at: Date;
      }>
    >`
      SELECT DISTINCT
        red."id",
        red."fighter_id",
        red."tournament_id",
        red."type",
        red."source",
        red."reason",
        red."received_at"
      FROM "red_card_yellow_sources" source
      JOIN "disciplinary_cards" red
        ON red."id" = source."red_card_id"
      WHERE source."yellow_card_id" IN (${Prisma.join(yellowCardIds)})
        AND red."type" = 'RED'
        AND red."source" = 'AUTOMATIC'
    `;
  }

  private async restoreSourceYellowsForDeletedRedsTx(
    tx: PrismaTx,
    redCardIds: number[],
  ) {
    await tx.$executeRaw`
      UPDATE "disciplinary_cards" yellow
      SET
        "active" = COALESCE(source."yellow_active_before_close", yellow."active"),
        "expires_at" = COALESCE(source."yellow_expires_at_before_close", yellow."expires_at"),
        "updated_at" = CURRENT_TIMESTAMP
      FROM "red_card_yellow_sources" source
      WHERE source."red_card_id" IN (${Prisma.join(redCardIds)})
        AND source."yellow_card_id" = yellow."id"
        AND source."closed_at" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "red_card_yellow_sources" other_source
          JOIN "disciplinary_cards" red
            ON red."id" = other_source."red_card_id"
          WHERE other_source."yellow_card_id" = yellow."id"
            AND other_source."red_card_id" NOT IN (${Prisma.join(redCardIds)})
            AND other_source."closed_at" IS NOT NULL
            AND red."type" = 'RED'
            AND red."active" = true
        )
    `;
  }

  private getAffectedAutomaticRedContexts(
    cards: Array<{
      fighter_id: number;
      tournament_id: number;
      received_at: Date;
    }>,
  ) {
    const contexts = new Map<
      string,
      { fighterId: number; tournamentId: number; checkDate: Date }
    >();

    for (const card of cards) {
      const key = `${card.fighter_id}:${card.tournament_id}:${card.received_at.toISOString()}`;
      contexts.set(key, {
        fighterId: card.fighter_id,
        tournamentId: card.tournament_id,
        checkDate: card.received_at,
      });
    }

    return [...contexts.values()];
  }

  private async recreateInactiveCrossTournamentRedsTx(
    tx: PrismaTx,
    contexts: Array<{
      fighterId: number;
      tournamentId: number;
      checkDate: Date;
    }>,
  ) {
    for (const context of contexts) {
      const activeYellows = await tx.disciplinary_cards.findMany({
        where: {
          fighter_id: context.fighterId,
          type: 'YELLOW',
          active: true,
          received_at: { lte: context.checkDate },
          expires_at: { gte: context.checkDate },
        },
        orderBy: [{ received_at: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          tournament_id: true,
          fight_id: true,
          marshal_id: true,
          received_at: true,
        },
      });
      const sameTournamentYellows = activeYellows.filter(
        (card) => card.tournament_id === context.tournamentId,
      );
      if (activeYellows.length < 3 || sameTournamentYellows.length >= 2) {
        continue;
      }

      const sourceYellows = activeYellows.slice(0, 3);
      const triggerYellow = sourceYellows[sourceYellows.length - 1];
      const [activeRedExists, inactiveCrossRedExists] = await Promise.all([
        tx.disciplinary_cards.findFirst({
          where: {
            fighter_id: context.fighterId,
            type: 'RED',
            active: true,
            received_at: { lte: triggerYellow.received_at },
            expires_at: { gte: triggerYellow.received_at },
          },
          select: { id: true },
        }),
        tx.disciplinary_cards.findFirst({
          where: {
            fighter_id: context.fighterId,
            type: 'RED',
            source: 'AUTOMATIC',
            active: false,
            reason: AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT,
            received_at: { lte: triggerYellow.received_at },
            expires_at: { gte: triggerYellow.received_at },
          },
          select: { id: true },
        }),
      ]);
      if (activeRedExists || inactiveCrossRedExists) continue;

      const settings = await tx.disciplinary_card_settings.findUnique({
        where: { id: 1 },
        select: { red_auto_yellow_days: true },
      });
      const redCard = await tx.disciplinary_cards.create({
        data: {
          fighter_id: context.fighterId,
          tournament_id: triggerYellow.tournament_id,
          fight_id: triggerYellow.fight_id,
          marshal_id: triggerYellow.marshal_id,
          type: 'RED',
          source: 'AUTOMATIC',
          received_at: triggerYellow.received_at,
          reason: AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT,
          expires_at: this.addDays(
            triggerYellow.received_at,
            settings?.red_auto_yellow_days ?? 45,
          ),
          active: false,
        },
        select: { id: true },
      });
      await tx.red_card_yellow_sources.createMany({
        data: sourceYellows.map((yellow) => ({
          red_card_id: redCard.id,
          yellow_card_id: yellow.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  private addDays(date: Date, days: number) {
    const result = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    result.setUTCDate(result.getUTCDate() + days);

    return result;
  }
}
