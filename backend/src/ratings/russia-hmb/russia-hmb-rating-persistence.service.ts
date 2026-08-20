import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  PrismaTx,
  RussiaHmbCalculationResult,
  RussiaHmbTournamentNomination,
  RussiaHmbTournamentNominationRating,
} from './russia-hmb-rating.types';

@Injectable()
export class RussiaHmbRatingPersistence {
  async saveCalculationTx(
    tx: PrismaTx,
    params: {
      tournamentNomination: RussiaHmbTournamentNomination;
      coefficient: number;
      calculatedByUserId: number | null;
      calculation: RussiaHmbCalculationResult[];
    },
  ): Promise<RussiaHmbTournamentNominationRating> {
    const existing = await tx.russia_hmb_rating_calculations.findUnique({
      where: {
        tournament_nomination_id: params.tournamentNomination.id,
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Russia HMB rating already calculated');
    }

    const calculation = await tx.russia_hmb_rating_calculations.create({
      data: {
        tournament_nomination_id: params.tournamentNomination.id,
        tournament_id: params.tournamentNomination.tournament_id,
        nomination_id: params.tournamentNomination.nomination_id,
        event_year: params.tournamentNomination.event_date.getUTCFullYear(),
        coefficient: params.coefficient,
        calculated_by_user_id: params.calculatedByUserId,
      },
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

    if (params.calculation.length > 0) {
      await tx.russia_hmb_rating_results.createMany({
        data: params.calculation.map((result) => ({
          calculation_id: calculation.id,
          tournament_nomination_id: params.tournamentNomination.id,
          tournament_id: params.tournamentNomination.tournament_id,
          nomination_id: params.tournamentNomination.nomination_id,
          fighter_id: result.fighterId,
          competitor_id: result.competitorId,
          points: result.points,
          qc_points: result.qcPoints,
          qn_points: result.qnPoints,
          qm_points: result.qmPoints,
          yellow_cards_count: result.yellowCardsCount,
          active_red_cards_count: result.activeRedCardsCount,
          no_show_penalty_count: result.noShowPenaltyCount,
        })),
      });
    }

    const results = await tx.russia_hmb_rating_results.findMany({
      where: { calculation_id: calculation.id },
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

    return { calculation, results };
  }
}
