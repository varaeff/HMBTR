import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RatingCalculationReader } from './calculation/rating-calculation-reader.service';
import { RatingCalculationService } from './calculation/rating-calculation.service';
import { RatingPersistenceService } from './calculation/rating-persistence.service';
import { RatingLeaderboardService } from './leaderboard/rating-leaderboard.service';
import { FighterRatingProfileService } from './profile/fighter-rating-profile.service';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';

@Module({
  imports: [PrismaModule],
  controllers: [RatingsController],
  providers: [
    FighterRatingProfileService,
    RatingCalculationReader,
    RatingCalculationService,
    RatingLeaderboardService,
    RatingPersistenceService,
    RatingsService,
  ],
  exports: [RatingsService],
})
export class RatingsModule {}
