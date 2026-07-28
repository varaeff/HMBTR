import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RATING_ORDER } from '../leaderboard/rating-leaderboard.service';
import type {
  FighterFightCounter,
  FighterNominationFightCounter,
  FighterProfileNomination,
  FighterProfileStats,
  FighterProfileTournament,
  FighterRatingHistoryPoint,
  FighterRatingSummary,
} from '../ratings-internal.types';

@Injectable()
export class FighterRatingProfileService {
  constructor(private prisma: PrismaService) {}

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
      const nominationCounter = fightCountersByNomination.get(
        fight.nomination_id,
      ) ?? {
        fights: 0,
        wins: 0,
      };

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

    const placesByNomination = await this.getPlacesByNomination(
      fighterId,
      ratings.map((rating) => rating.nomination_id),
    );
    const ratingSummaries = ratings.map((rating): FighterRatingSummary => {
      const placement = placesByNomination.get(rating.nomination_id);

      return {
        nomination: {
          id: rating.nomination.id,
          name_ru: rating.nomination.name_ru,
          name_en: rating.nomination.name_en,
        },
        place: placement?.place ?? 0,
        total_fighters: placement?.total ?? 0,
        rating: rating.rating,
        fights_count: rating.fights_count,
        history: historyByNomination.get(rating.nomination_id) ?? [],
      };
    });

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

  private async getPlacesByNomination(
    fighterId: number,
    nominationIds: number[],
  ) {
    const uniqueNominationIds = [...new Set(nominationIds)];
    if (!uniqueNominationIds.length) {
      return new Map<number, { place: number; total: number }>();
    }

    const rows = await this.prisma.fighter_nomination_ratings.findMany({
      where: { nomination_id: { in: uniqueNominationIds } },
      orderBy: [{ nomination_id: 'asc' }, ...RATING_ORDER],
      select: { fighter_id: true, nomination_id: true },
    });
    const grouped = new Map<number, Array<{ fighter_id: number }>>();

    for (const row of rows) {
      const nominationRows = grouped.get(row.nomination_id) ?? [];
      nominationRows.push({ fighter_id: row.fighter_id });
      grouped.set(row.nomination_id, nominationRows);
    }

    const placesByNomination = new Map<
      number,
      { place: number; total: number }
    >();
    for (const [nominationId, nominationRows] of grouped) {
      const index = nominationRows.findIndex(
        (row) => row.fighter_id === fighterId,
      );
      placesByNomination.set(nominationId, {
        place: index >= 0 ? index + 1 : 0,
        total: nominationRows.length,
      });
    }

    return placesByNomination;
  }

  private tournamentNominationKey(tournamentId: number, nominationId: number) {
    return `${tournamentId}:${nominationId}`;
  }
}
