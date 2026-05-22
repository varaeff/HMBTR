import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculateNominationRatings,
  ExistingRating,
  RatingFight,
  RatingParticipant,
} from './ratings.logic';

const STATUS_PENDING = 'PENDING';
const STATUS_PROCESSING = 'PROCESSING';
const STATUS_CALCULATED = 'CALCULATED';
const STATUS_FAILED = 'FAILED';

type PrismaTx = Omit<
  PrismaService,
  | '$connect'
  | '$disconnect'
  | '$on'
  | '$transaction'
  | '$use'
  | '$extends'
  | 'onModuleInit'
>;

export interface FighterProfileNomination {
  id: number;
  name_ru: string;
  name_en: string;
}

export interface FighterProfileTournament {
  tournament_id: number;
  tournament_name: string;
  event_date: Date | null;
  nomination: FighterProfileNomination;
}

export interface FighterFightCounter {
  fights: number;
  wins: number;
}

export interface FighterNominationFightCounter extends FighterFightCounter {
  nomination: FighterProfileNomination;
}

export interface FighterRatingHistoryPoint {
  tournament_id: number;
  tournament_name: string;
  event_date: Date | null;
  rating_before: number;
  rating_after: number;
  fights_count_delta: number;
  created_at: Date;
}

export interface FighterRatingSummary {
  nomination: FighterProfileNomination;
  place: number;
  total_fighters: number;
  rating: number;
  fights_count: number;
  history: FighterRatingHistoryPoint[];
}

export interface FighterProfileStats {
  tournaments: FighterProfileTournament[];
  fights: {
    total: FighterFightCounter;
    by_nomination: FighterNominationFightCounter[];
  };
  ratings: FighterRatingSummary[];
}

@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);

  constructor(private prisma: PrismaService) {}

  async findRatedNominations() {
    return this.prisma.nominations.findMany({
      where: {
        fighter_ratings: {
          some: {},
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  async findByNomination(nominationId: number) {
    return this.prisma.fighter_nomination_ratings.findMany({
      where: { nomination_id: nominationId },
      orderBy: [
        { rating: 'desc' },
        { fights_count: 'desc' },
        { fighter: { surname: 'asc' } },
        { fighter: { name: 'asc' } },
        { fighter_id: 'asc' },
      ],
      include: {
        fighter: {
          include: {
            country: true,
            city: true,
            club: true,
          },
        },
      },
    });
  }

  async findFighterProfile(fighterId: number): Promise<FighterProfileStats> {
    const fighter = await this.prisma.fighters.findUnique({
      where: { id: fighterId },
      select: { id: true },
    });

    if (!fighter) {
      throw new NotFoundException('Fighter not found');
    }

    const competitors = await this.prisma.competitors.findMany({
      where: { fighter_id: fighterId },
      select: {
        tournament_id: true,
        nomination_id: true,
        tournament: {
          select: {
            id: true,
            name: true,
            event_date: true,
            nominations: {
              where: { is_finished: true },
              select: { nomination_id: true },
            },
          },
        },
        nomination: {
          select: { id: true, name_ru: true, name_en: true },
        },
      },
    });

    const completedKeys = new Set<string>();
    const tournamentEntries = new Map<string, FighterProfileTournament>();
    const nominationEntries = new Map<number, FighterProfileNomination>();

    for (const competitor of competitors) {
      const isCompleted = competitor.tournament.nominations.some(
        (nomination) => nomination.nomination_id === competitor.nomination_id,
      );

      if (!isCompleted) continue;

      const key = this.tournamentNominationKey(
        competitor.tournament_id,
        competitor.nomination_id,
      );
      completedKeys.add(key);
      nominationEntries.set(competitor.nomination.id, competitor.nomination);
      tournamentEntries.set(key, {
        tournament_id: competitor.tournament.id,
        tournament_name: competitor.tournament.name,
        event_date: competitor.tournament.event_date,
        nomination: competitor.nomination,
      });
    }

    const [fights, ratings, history] = await Promise.all([
      this.prisma.fights.findMany({
        where: {
          is_finished: true,
          OR: [
            { competitor1: { fighter_id: fighterId } },
            { competitor2: { fighter_id: fighterId } },
          ],
        },
        select: {
          tournament_id: true,
          nomination_id: true,
          competitor1_id: true,
          competitor2_id: true,
          winner_id: true,
          competitor1: { select: { fighter_id: true } },
          competitor2: { select: { fighter_id: true } },
        },
      }),
      this.prisma.fighter_nomination_ratings.findMany({
        where: { fighter_id: fighterId },
        include: {
          nomination: true,
        },
      }),
      this.prisma.fighter_nomination_rating_history.findMany({
        where: { fighter_id: fighterId },
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
        include: {
          tournament: {
            select: { id: true, name: true, event_date: true },
          },
          nomination: {
            select: { id: true, name_ru: true, name_en: true },
          },
        },
      }),
    ]);

    const fightTotals: FighterFightCounter = { fights: 0, wins: 0 };
    const fightCountersByNomination = new Map<number, FighterFightCounter>();

    for (const nomination of nominationEntries.values()) {
      fightCountersByNomination.set(nomination.id, { fights: 0, wins: 0 });
    }

    for (const fight of fights) {
      const key = this.tournamentNominationKey(
        fight.tournament_id,
        fight.nomination_id,
      );
      if (!completedKeys.has(key)) continue;

      const fighterCompetitorId =
        fight.competitor1.fighter_id === fighterId
          ? fight.competitor1_id
          : fight.competitor2_id;
      const won = fight.winner_id === fighterCompetitorId;
      const nominationCounter =
        fightCountersByNomination.get(fight.nomination_id) ??
        { fights: 0, wins: 0 };

      fightTotals.fights += 1;
      nominationCounter.fights += 1;

      if (won) {
        fightTotals.wins += 1;
        nominationCounter.wins += 1;
      }

      fightCountersByNomination.set(fight.nomination_id, nominationCounter);
    }

    const historyByNomination = new Map<number, FighterRatingHistoryPoint[]>();

    for (const item of history) {
      const nominationHistory =
        historyByNomination.get(item.nomination_id) ?? [];
      nominationHistory.push({
        tournament_id: item.tournament.id,
        tournament_name: item.tournament.name,
        event_date: item.tournament.event_date,
        rating_before: item.rating_before,
        rating_after: item.rating_after,
        fights_count_delta: item.fights_count_delta,
        created_at: item.created_at,
      });
      historyByNomination.set(item.nomination_id, nominationHistory);
    }

    const ratingSummaries = await Promise.all(
      ratings.map(async (rating): Promise<FighterRatingSummary> => {
        const nominationRatings =
          await this.prisma.fighter_nomination_ratings.findMany({
            where: { nomination_id: rating.nomination_id },
            orderBy: [
              { rating: 'desc' },
              { fights_count: 'desc' },
              { fighter: { surname: 'asc' } },
              { fighter: { name: 'asc' } },
              { fighter_id: 'asc' },
            ],
            select: { fighter_id: true },
          });
        const index = nominationRatings.findIndex(
          (item) => item.fighter_id === fighterId,
        );

        return {
          nomination: {
            id: rating.nomination.id,
            name_ru: rating.nomination.name_ru,
            name_en: rating.nomination.name_en,
          },
          place: index >= 0 ? index + 1 : 0,
          total_fighters: nominationRatings.length,
          rating: rating.rating,
          fights_count: rating.fights_count,
          history: historyByNomination.get(rating.nomination_id) ?? [],
        };
      }),
    );

    return {
      tournaments: [...tournamentEntries.values()].sort((first, second) => {
        const firstTime = first.event_date?.getTime() ?? 0;
        const secondTime = second.event_date?.getTime() ?? 0;
        if (firstTime !== secondTime) return secondTime - firstTime;
        if (first.tournament_id !== second.tournament_id) {
          return second.tournament_id - first.tournament_id;
        }
        return first.nomination.id - second.nomination.id;
      }),
      fights: {
        total: fightTotals,
        by_nomination: [...fightCountersByNomination.entries()]
          .map(([nominationId, counter]) => {
            const nomination = nominationEntries.get(nominationId);

            if (!nomination) return null;

            return {
              nomination,
              fights: counter.fights,
              wins: counter.wins,
            };
          })
          .filter((item): item is FighterNominationFightCounter =>
            Boolean(item),
          )
          .sort((first, second) => first.nomination.id - second.nomination.id),
      },
      ratings: ratingSummaries.sort(
        (first, second) => first.nomination.id - second.nomination.id,
      ),
    };
  }

  async calculateForTournamentNomination(tournamentNominationId: number) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.tournament_nominations.updateMany({
          where: {
            id: tournamentNominationId,
            is_finished: true,
            rating_status: { in: [STATUS_PENDING, STATUS_FAILED] },
          },
          data: {
            rating_status: STATUS_PROCESSING,
            rating_error: null,
          },
        });

        if (claimed.count === 0) return;

        await this.calculateClaimedTournamentNominationTx(
          tx,
          tournamentNominationId,
        );
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown rating error';

      this.logger.error(
        `Rating calculation failed for tournament nomination ${tournamentNominationId}: ${message}`,
      );

      await this.prisma.tournament_nominations.updateMany({
        where: {
          id: tournamentNominationId,
          rating_status: { not: STATUS_CALCULATED },
        },
        data: {
          rating_status: STATUS_FAILED,
          rating_error: message,
        },
      });
    }
  }

  private async calculateClaimedTournamentNominationTx(
    tx: PrismaTx,
    tournamentNominationId: number,
  ) {
    const tournamentNomination = await tx.tournament_nominations.findUnique({
      where: { id: tournamentNominationId },
    });

    if (!tournamentNomination) {
      throw new NotFoundException('Tournament nomination not found');
    }

    const participants = await this.getParticipantsTx(
      tx,
      tournamentNomination.tournament_id,
      tournamentNomination.nomination_id,
    );
    const existingRatings = await this.getExistingRatingsTx(
      tx,
      tournamentNomination.nomination_id,
      participants,
    );
    const fights = await this.getRatingFightsTx(
      tx,
      tournamentNomination.tournament_id,
      tournamentNomination.nomination_id,
    );
    const calculation = calculateNominationRatings(
      participants,
      existingRatings,
      fights,
    );

    for (const rating of calculation) {
      await tx.fighter_nomination_ratings.upsert({
        where: {
          nomination_id_fighter_id: {
            nomination_id: tournamentNomination.nomination_id,
            fighter_id: rating.fighterId,
          },
        },
        update: {
          rating: rating.ratingAfter,
          fights_count: rating.fightsCountAfter,
        },
        create: {
          nomination_id: tournamentNomination.nomination_id,
          fighter_id: rating.fighterId,
          rating: rating.ratingAfter,
          fights_count: rating.fightsCountAfter,
        },
      });
    }

    if (calculation.length > 0) {
      await tx.fighter_nomination_rating_history.createMany({
        data: calculation.map((rating) => ({
          nomination_id: tournamentNomination.nomination_id,
          fighter_id: rating.fighterId,
          tournament_id: tournamentNomination.tournament_id,
          tournament_nomination_id: tournamentNomination.id,
          rating_before: rating.ratingBefore,
          rating_after: rating.ratingAfter,
          fights_count_delta: rating.fightsCountDelta,
        })),
      });
    }

    await tx.tournament_nominations.update({
      where: { id: tournamentNomination.id },
      data: {
        rating_status: STATUS_CALCULATED,
        rating_calculated_at: new Date(),
        rating_error: null,
      },
    });
  }

  private async getParticipantsTx(
    tx: PrismaTx,
    tournamentId: number,
    nominationId: number,
  ): Promise<RatingParticipant[]> {
    const competitors = await tx.competitors.findMany({
      where: {
        tournament_id: tournamentId,
        nomination_id: nominationId,
      },
      orderBy: { id: 'asc' },
      select: {
        fighter_id: true,
      },
    });
    const fighterIds = [...new Set(competitors.map((item) => item.fighter_id))];

    return fighterIds.map((fighterId) => ({ fighterId }));
  }

  private async getExistingRatingsTx(
    tx: PrismaTx,
    nominationId: number,
    participants: RatingParticipant[],
  ): Promise<ExistingRating[]> {
    if (participants.length === 0) return [];

    const ratings = await tx.fighter_nomination_ratings.findMany({
      where: {
        nomination_id: nominationId,
        fighter_id: {
          in: participants.map((participant) => participant.fighterId),
        },
      },
    });

    return ratings.map((rating) => ({
      fighterId: rating.fighter_id,
      rating: rating.rating,
      fightsCount: rating.fights_count,
    }));
  }

  private async getRatingFightsTx(
    tx: PrismaTx,
    tournamentId: number,
    nominationId: number,
  ): Promise<RatingFight[]> {
    const fights = await tx.fights.findMany({
      where: {
        tournament_id: tournamentId,
        nomination_id: nominationId,
        is_finished: true,
        winner_id: { not: null },
      },
      orderBy: [{ fight_number: 'asc' }, { id: 'asc' }],
      include: {
        competitor1: {
          select: { fighter_id: true },
        },
        competitor2: {
          select: { fighter_id: true },
        },
      },
    });

    return fights.map((fight) => ({
      competitor1FighterId: fight.competitor1.fighter_id,
      competitor2FighterId: fight.competitor2.fighter_id,
      winnerFighterId: this.getWinnerFighterId({
        winnerCompetitorId: fight.winner_id,
        competitor1Id: fight.competitor1_id,
        competitor2Id: fight.competitor2_id,
        competitor1FighterId: fight.competitor1.fighter_id,
        competitor2FighterId: fight.competitor2.fighter_id,
      }),
      isFinished: fight.is_finished,
      forfeitCardId: fight.forfeit_card_id,
    }));
  }

  private getWinnerFighterId(params: {
    winnerCompetitorId: number | null;
    competitor1Id: number;
    competitor2Id: number;
    competitor1FighterId: number;
    competitor2FighterId: number;
  }) {
    if (params.winnerCompetitorId === params.competitor1Id) {
      return params.competitor1FighterId;
    }

    if (params.winnerCompetitorId === params.competitor2Id) {
      return params.competitor2FighterId;
    }

    return null;
  }

  private tournamentNominationKey(tournamentId: number, nominationId: number) {
    return `${tournamentId}:${nominationId}`;
  }
}
