import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { STATUS_CALCULATED, STATUS_FAILED } from '../ratings.constants';
import type { RatingCalculationResult } from '../ratings.logic';
import type {
  PrismaTx,
  RatingTournamentNomination,
} from '../ratings-internal.types';

@Injectable()
export class RatingPersistenceService {
  constructor(private prisma: PrismaService) {}

  async saveCalculationTx(
    tx: PrismaTx,
    tournamentNomination: RatingTournamentNomination,
    calculation: RatingCalculationResult[],
  ) {
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
  }

  async markCalculatedTx(
    tx: PrismaTx,
    tournamentNomination: RatingTournamentNomination,
  ) {
    await tx.tournament_nominations.update({
      where: { id: tournamentNomination.id },
      data: {
        rating_status: STATUS_CALCULATED,
        rating_calculated_at: new Date(),
        rating_error: null,
      },
    });
  }

  async markFailed(tournamentNominationId: number, message: string) {
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
