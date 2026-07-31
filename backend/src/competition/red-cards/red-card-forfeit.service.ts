import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { emptyFightScoreData } from '../competition.helpers';
import type { ActiveRedCard, PrismaTx } from '../competition-internal.types';
import { CompetitionScoringService } from '../scoring/competition-scoring.service';
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
    const cards = await tx.disciplinary_cards.findMany({
      where: { fight_id: { in: fights.map((fight) => fight.id) } },
      select: { id: true },
    });
    if (!cards.length) return;
    const affectedFights = await tx.fights.findMany({
      where: { forfeit_card_id: { in: cards.map((card) => card.id) } },
      select: { id: true },
    });
    await tx.fights.updateMany({
      where: { forfeit_card_id: { in: cards.map((card) => card.id) } },
      data: emptyFightScoreData,
    });
    if (affectedFights.length) {
      await tx.fight_round_scores.deleteMany({
        where: { fight_id: { in: affectedFights.map((fight) => fight.id) } },
      });
    }
  }
}
