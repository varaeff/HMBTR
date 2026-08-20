import { Injectable } from '@nestjs/common';
import { RatingCalculationService } from './calculation/rating-calculation.service';
import { RatingLeaderboardService } from './leaderboard/rating-leaderboard.service';
import { FighterRatingProfileService } from './profile/fighter-rating-profile.service';
import { RussiaHmbRatingService } from './russia-hmb/russia-hmb-rating.service';
import type { RussiaHmbCoefficient } from './russia-hmb/russia-hmb-rating.types';
export type {
  FighterFightCounter,
  FighterNominationFightCounter,
  FighterProfileNomination,
  FighterProfileStats,
  FighterProfileTournament,
  FighterRatingHistoryPoint,
  FighterRatingSummary,
} from './ratings-internal.types';

@Injectable()
export class RatingsService {
  constructor(
    private calculation: RatingCalculationService,
    private leaderboard: RatingLeaderboardService,
    private profile: FighterRatingProfileService,
    private russiaHmbRating: RussiaHmbRatingService,
  ) {}

  async findRatedNominations() {
    return this.leaderboard.findRatedNominations();
  }

  async findByNomination(nominationId: number) {
    return this.leaderboard.findByNomination(nominationId);
  }

  async findFighterProfile(fighterId: number) {
    return this.profile.findFighterProfile(fighterId);
  }

  async findFighterEloRatings(fighterId: number) {
    return this.profile.findFighterEloRatings(fighterId);
  }

  async calculateForTournamentNomination(tournamentNominationId: number) {
    return this.calculation.calculateForTournamentNomination(
      tournamentNominationId,
    );
  }

  async calculateRussiaHmbForTournamentNomination(params: {
    tournamentId: number;
    nominationId: number;
    coefficient: RussiaHmbCoefficient;
    user?: {
      id?: number;
      is_admin?: boolean;
      is_secretary?: boolean;
    };
  }) {
    return this.russiaHmbRating.calculateForTournamentNomination(params);
  }

  async findRussiaHmbByTournamentNomination(
    tournamentId: number,
    nominationId: number,
  ) {
    return this.russiaHmbRating.findByTournamentNomination(
      tournamentId,
      nominationId,
    );
  }

  async findRussiaHmbYears() {
    return this.russiaHmbRating.findAvailableYears();
  }

  async findRussiaHmbNominationsByYear(year: number) {
    return this.russiaHmbRating.findNominationsByYear(year);
  }

  async findRussiaHmbLeaderboard(year: number, nominationId: number) {
    return this.russiaHmbRating.findLeaderboard(year, nominationId);
  }

  async findRussiaHmbFighterProfile(fighterId: number) {
    return this.russiaHmbRating.findFighterProfile(fighterId);
  }
}
