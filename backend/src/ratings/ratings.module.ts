import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RatingCalculationReader } from './calculation/rating-calculation-reader.service';
import { RatingCalculationService } from './calculation/rating-calculation.service';
import { RatingPersistenceService } from './calculation/rating-persistence.service';
import { RatingLeaderboardService } from './leaderboard/rating-leaderboard.service';
import { FighterRatingProfileService } from './profile/fighter-rating-profile.service';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';
import { RussiaHmbRatingPersistence } from './russia-hmb/russia-hmb-rating-persistence.service';
import { RussiaHmbRatingReader } from './russia-hmb/russia-hmb-rating-reader.service';
import { RussiaHmbRatingService } from './russia-hmb/russia-hmb-rating.service';

@Module({
  imports: [PrismaModule],
  controllers: [RatingsController],
  providers: [
    FighterRatingProfileService,
    RatingCalculationReader,
    RatingCalculationService,
    RatingLeaderboardService,
    RatingPersistenceService,
    RussiaHmbRatingPersistence,
    RussiaHmbRatingReader,
    RussiaHmbRatingService,
    RatingsService,
  ],
  exports: [RatingsService],
})
export class RatingsModule {}
