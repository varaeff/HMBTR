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

interface FighterProfileOptions {
  includeEloRatings?: boolean;
}

interface CompletedTournamentNomination {
  tournament_id: number;
  tournament_name: string;
  event_date: Date | null;
  nomination: FighterProfileNomination;
}

interface MutableRussiaHmbYearNomination {
  nomination: FighterProfileNomination;
  points: number;
  tournamentIds: Set<number>;
}

@Injectable()
export class FighterRatingProfileService {
  constructor(private prisma: PrismaService) {}

  async findFighterProfile(
    fighterId: number,
    options: FighterProfileOptions = {},
  ): Promise<FighterProfileStats> {
    await this.assertFighterExists(fighterId);

    const completed = await this.getCompletedTournamentNominations(fighterId);
    const completedKeys = new Set(
      completed.map((item) =>
        this.tournamentNominationKey(item.tournament_id, item.nomination.id),
      ),
    );
    const nominationEntries = new Map(
      completed.map((item) => [item.nomination.id, item.nomination]),
    );

    const [fights, russiaHmbResults] = await Promise.all([
      this.getFinishedFights(fighterId),
      this.getRussiaHmbResults(fighterId),
    ]);
    const fightStats = this.buildFightStats({
      fighterId,
      fights,
      completedKeys,
      nominationEntries,
    });
    const russiaHmbPointsByTournamentNomination = new Map(
      russiaHmbResults.map((result) => [
        this.tournamentNominationKey(result.tournament_id, result.nomination_id),
        result.points,
      ]),
    );
    const ratings = options.includeEloRatings
      ? await this.getEloRatings(fighterId)
      : [];

    return {
      tournaments: this.buildTournamentRows(
        completed,
        russiaHmbPointsByTournamentNomination,
      ),
      fights: fightStats,
      ratings,
      russia_hmb_ratings: this.buildRussiaHmbYearSummaries(russiaHmbResults),
    };
  }

  async findFighterEloRatings(
    fighterId: number,
  ): Promise<FighterRatingSummary[]> {
    await this.assertFighterExists(fighterId);

    return this.getEloRatings(fighterId);
  }

  private async assertFighterExists(fighterId: number) {
    const fighter = await this.prisma.fighters.findUnique({
      where: { id: fighterId },
      select: { id: true },
    });

    if (!fighter) {
      throw new NotFoundException('Fighter not found');
    }
  }

  private async getCompletedTournamentNominations(
    fighterId: number,
  ): Promise<CompletedTournamentNomination[]> {
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

    return competitors
      .filter((competitor) =>
        competitor.tournament.nominations.some(
          (nomination) => nomination.nomination_id === competitor.nomination_id,
        ),
      )
      .map((competitor) => ({
        tournament_id: competitor.tournament.id,
        tournament_name: competitor.tournament.name,
        event_date: competitor.tournament.event_date,
        nomination: competitor.nomination,
      }));
  }

  private getFinishedFights(fighterId: number) {
    return this.prisma.fights.findMany({
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
    });
  }

  private getRussiaHmbResults(fighterId: number) {
    return this.prisma.russia_hmb_rating_results.findMany({
      where: { fighter_id: fighterId },
      include: {
        calculation: { select: { event_year: true } },
        nomination: { select: { id: true, name_ru: true, name_en: true } },
      },
      orderBy: [{ tournament_id: 'asc' }, { nomination_id: 'asc' }],
    });
  }

  private async getEloRatings(
    fighterId: number,
  ): Promise<FighterRatingSummary[]> {
    const [ratings, history] = await Promise.all([
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

    return ratings
      .map((rating): FighterRatingSummary => {
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
      })
      .sort((first, second) => first.nomination.id - second.nomination.id);
  }

  private buildFightStats(params: {
    fighterId: number;
    fights: Awaited<ReturnType<FighterRatingProfileService['getFinishedFights']>>;
    completedKeys: Set<string>;
    nominationEntries: Map<number, FighterProfileNomination>;
  }) {
    const fightTotals: FighterFightCounter = { fights: 0, wins: 0 };
    const fightCountersByNomination = new Map<number, FighterFightCounter>();

    for (const nomination of params.nominationEntries.values()) {
      fightCountersByNomination.set(nomination.id, { fights: 0, wins: 0 });
    }

    for (const fight of params.fights) {
      const key = this.tournamentNominationKey(
        fight.tournament_id,
        fight.nomination_id,
      );
      if (!params.completedKeys.has(key)) continue;

      const fighterCompetitorId =
        fight.competitor1.fighter_id === params.fighterId
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

    return {
      total: fightTotals,
      by_nomination: [...fightCountersByNomination.entries()]
        .map(([nominationId, counter]) => {
          const nomination = params.nominationEntries.get(nominationId);

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
    };
  }

  private buildTournamentRows(
    completed: CompletedTournamentNomination[],
    russiaHmbPointsByTournamentNomination: Map<string, number>,
  ): FighterProfileTournament[] {
    const tournamentEntries = new Map<number, FighterProfileTournament>();

    for (const item of completed) {
      const existing =
        tournamentEntries.get(item.tournament_id) ??
        {
          tournament_id: item.tournament_id,
          tournament_name: item.tournament_name,
          event_date: item.event_date,
          nominations: [],
        };

      existing.nominations.push({
        nomination: item.nomination,
        russia_hmb_rating_points:
          russiaHmbPointsByTournamentNomination.get(
            this.tournamentNominationKey(item.tournament_id, item.nomination.id),
          ) ?? null,
      });
      existing.nominations.sort(
        (first, second) => first.nomination.id - second.nomination.id,
      );
      tournamentEntries.set(item.tournament_id, existing);
    }

    return [...tournamentEntries.values()].sort((first, second) => {
      const firstTime = first.event_date?.getTime() ?? 0;
      const secondTime = second.event_date?.getTime() ?? 0;
      if (firstTime !== secondTime) return secondTime - firstTime;
      return second.tournament_id - first.tournament_id;
    });
  }

  private buildRussiaHmbYearSummaries(
    results: Awaited<ReturnType<FighterRatingProfileService['getRussiaHmbResults']>>,
  ) {
    const yearMap = new Map<number, Map<number, MutableRussiaHmbYearNomination>>();

    for (const result of results) {
      const nominationMap =
        yearMap.get(result.calculation.event_year) ?? new Map();
      const existing =
        nominationMap.get(result.nomination_id) ??
        {
          nomination: result.nomination,
          points: 0,
          tournamentIds: new Set<number>(),
        };

      existing.points += result.points;
      existing.tournamentIds.add(result.tournament_id);
      nominationMap.set(result.nomination_id, existing);
      yearMap.set(result.calculation.event_year, nominationMap);
    }

    return [...yearMap.entries()]
      .map(([year, nominationMap]) => ({
        year,
        nominations: [...nominationMap.values()]
          .map((summary) => ({
            nomination: summary.nomination,
            points: summary.points,
            tournaments_count: summary.tournamentIds.size,
          }))
          .sort((first, second) => first.nomination.id - second.nomination.id),
      }))
      .sort((first, second) => second.year - first.year);
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
