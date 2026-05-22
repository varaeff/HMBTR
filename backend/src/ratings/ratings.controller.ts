import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { API_ROUTES } from '@shared/routes';
import { Public } from '../auth/decorators/public.decorator';
import { RatingsService } from './ratings.service';

@Controller(API_ROUTES.RATINGS.ROOT)
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Public()
  @Get()
  findRatedNominations() {
    return this.ratingsService.findRatedNominations();
  }

  @Public()
  @Get('nomination/:nominationId')
  findByNomination(
    @Param('nominationId', ParseIntPipe) nominationId: number,
  ) {
    return this.ratingsService.findByNomination(nominationId);
  }

  @Public()
  @Get('fighter/:fighterId/profile')
  findFighterProfile(@Param('fighterId', ParseIntPipe) fighterId: number) {
    return this.ratingsService.findFighterProfile(fighterId);
  }
}
