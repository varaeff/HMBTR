import { Injectable } from '@nestjs/common';
import { RatingCalculationService } from './calculation/rating-calculation.service';
import { RatingLeaderboardService } from './leaderboard/rating-leaderboard.service';
import { FighterRatingProfileService } from './profile/fighter-rating-profile.service';
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

  async calculateForTournamentNomination(tournamentNominationId: number) {
    return this.calculation.calculateForTournamentNomination(
      tournamentNominationId,
    );
  }
}
