import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateRussiaHmbRatings } from './russia-hmb-rating.logic';
import { RussiaHmbRatingPersistence } from './russia-hmb-rating-persistence.service';
import { RussiaHmbRatingReader } from './russia-hmb-rating-reader.service';
import type {
  RussiaHmbCoefficient,
  RussiaHmbFighterYearSummary,
  RussiaHmbLeaderboardRow,
  RussiaHmbRatingResultRow,
  RussiaHmbTournamentNominationRating,
} from './russia-hmb-rating.types';

export interface RussiaHmbRequestUser {
  id?: number;
  is_admin?: boolean;
  is_secretary?: boolean;
  is_organizer?: boolean;
}

interface MutableLeaderboardRow {
  fighter_id: number;
  points: number;
  tournamentIds: Set<number>;
  fighter: RussiaHmbLeaderboardRow['fighter'];
}

interface MutableFighterNominationSummary {
  nomination: {
    id: number;
    name_ru: string;
    name_en: string;
  };
  points: number;
  tournamentIds: Set<number>;
}

@Injectable()
export class RussiaHmbRatingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reader: RussiaHmbRatingReader,
    private readonly persistence: RussiaHmbRatingPersistence,
  ) {}

  async calculateForTournamentNomination(params: {
    tournamentId: number;
    nominationId: number;
    coefficient: RussiaHmbCoefficient;
    user?: RussiaHmbRequestUser;
  }): Promise<RussiaHmbTournamentNominationRating> {
    this.requireSecretaryOrAdmin(params.user);

    return this.prisma.$transaction(async (tx) => {
      const tournamentNomination = await this.reader.getTournamentNominationTx(
        tx,
        params.tournamentId,
        params.nominationId,
      );
      const participants = await this.reader.getParticipantsTx(
        tx,
        tournamentNomination.tournament_id,
        tournamentNomination.nomination_id,
      );
      const [fights, placements, penalties] = await Promise.all([
        this.reader.getFightsTx(
          tx,
          tournamentNomination.tournament_id,
          tournamentNomination.nomination_id,
        ),
        this.reader.getFinalPlacementsTx(tx, tournamentNomination.id),
        this.reader.getPenaltiesTx(tx, {
          tournamentNominationId: tournamentNomination.id,
          tournamentId: tournamentNomination.tournament_id,
          nominationId: tournamentNomination.nomination_id,
          eventDate: tournamentNomination.event_date,
          participants,
        }),
      ]);
      const calculation = calculateRussiaHmbRatings({
        coefficient: params.coefficient,
        participants,
        fights,
        placements,
        penalties,
      });

      return this.persistence.saveCalculationTx(tx, {
        tournamentNomination,
        coefficient: params.coefficient,
        calculatedByUserId: params.user?.id ?? null,
        calculation,
      });
    });
  }

  async findByTournamentNomination(
    tournamentId: number,
    nominationId: number,
  ): Promise<RussiaHmbTournamentNominationRating | null> {
    const calculation = await this.prisma.russia_hmb_rating_calculations.findFirst({
      where: { tournament_id: tournamentId, nomination_id: nominationId },
      select: {
        id: true,
        tournament_nomination_id: true,
        tournament_id: true,
        nomination_id: true,
        event_year: true,
        coefficient: true,
        calculated_at: true,
      },
    });

    if (!calculation) return null;

    const results = await this.findResultRows(calculation.id);

    return { calculation, results };
  }

  async findAvailableYears(): Promise<number[]> {
    const rows = await this.prisma.russia_hmb_rating_calculations.findMany({
      select: { event_year: true },
      orderBy: { event_year: 'desc' },
    });

    return [...new Set(rows.map((row) => row.event_year))];
  }

  async findNominationsByYear(year: number) {
    const calculations = await this.prisma.russia_hmb_rating_calculations.findMany({
      where: { event_year: year },
      orderBy: { nomination_id: 'asc' },
      include: { nomination: true },
    });
    const nominationById = new Map(
      calculations.map((calculation) => [
        calculation.nomination.id,
        calculation.nomination,
      ]),
    );

    return [...nominationById.values()].sort((first, second) => first.id - second.id);
  }

  async findLeaderboard(
    year: number,
    nominationId: number,
  ): Promise<RussiaHmbLeaderboardRow[]> {
    const results = await this.prisma.russia_hmb_rating_results.findMany({
      where: {
        nomination_id: nominationId,
        calculation: { event_year: year },
      },
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
    const grouped = new Map<number, MutableLeaderboardRow>();

    for (const result of results) {
      const existing =
        grouped.get(result.fighter_id) ??
        {
          fighter_id: result.fighter_id,
          points: 0,
          tournamentIds: new Set<number>(),
          fighter: result.fighter,
        };

      existing.points += result.points;
      existing.tournamentIds.add(result.tournament_id);
      grouped.set(result.fighter_id, existing);
    }

    return [...grouped.values()]
      .map((row) => ({
        fighter_id: row.fighter_id,
        points: row.points,
        tournaments_count: row.tournamentIds.size,
        fighter: row.fighter,
      }))
      .sort((first, second) => {
        if (first.points !== second.points) return second.points - first.points;
        return first.fighter_id - second.fighter_id;
      });
  }

  async findFighterProfile(fighterId: number): Promise<RussiaHmbFighterYearSummary[]> {
    const fighter = await this.prisma.fighters.findUnique({
      where: { id: fighterId },
      select: { id: true },
    });

    if (!fighter) {
      throw new NotFoundException('Fighter not found');
    }

    const results = await this.prisma.russia_hmb_rating_results.findMany({
      where: { fighter_id: fighterId },
      include: {
        calculation: { select: { event_year: true } },
        nomination: { select: { id: true, name_ru: true, name_en: true } },
      },
      orderBy: [{ nomination_id: 'asc' }, { tournament_id: 'asc' }],
    });
    const yearMap = new Map<number, Map<number, MutableFighterNominationSummary>>();

    for (const result of results) {
      const nominationMap = yearMap.get(result.calculation.event_year) ?? new Map();
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

  private findResultRows(calculationId: number): Promise<RussiaHmbRatingResultRow[]> {
    return this.prisma.russia_hmb_rating_results.findMany({
      where: { calculation_id: calculationId },
      orderBy: [{ points: 'desc' }, { fighter_id: 'asc' }],
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

  private requireSecretaryOrAdmin(user?: RussiaHmbRequestUser) {
    if (!user?.is_admin && !user?.is_secretary) {
      throw new ForbiddenException('Secretary or administrator access required');
    }
  }
}
