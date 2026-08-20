import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
} from '@nestjs/common';
import { API_ROUTES } from '@shared/routes';
import { Public } from '../auth/decorators/public.decorator';
import { CalculateRussiaHmbRatingDto } from './dto/calculate-russia-hmb-rating.dto';
import { RatingsService } from './ratings.service';

interface RequestUser {
  id?: number;
  is_admin?: boolean;
  is_organizer?: boolean;
  is_secretary?: boolean;
}

@Controller(API_ROUTES.RATINGS.ROOT)
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Get()
  findRatedNominations(@Req() req: { user?: RequestUser }) {
    this.requireAnyRole(req.user);

    return this.ratingsService.findRatedNominations();
  }

  @Get('nomination/:nominationId')
  findByNomination(
    @Param('nominationId', ParseIntPipe) nominationId: number,
    @Req() req: { user?: RequestUser },
  ) {
    this.requireAnyRole(req.user);

    return this.ratingsService.findByNomination(nominationId);
  }

  @Public()
  @Get('fighter/:fighterId/profile')
  findFighterProfile(@Param('fighterId', ParseIntPipe) fighterId: number) {
    return this.ratingsService.findFighterProfile(fighterId);
  }

  @Get('fighter/:fighterId/profile/elo')
  findFighterEloRatings(
    @Param('fighterId', ParseIntPipe) fighterId: number,
    @Req() req: { user?: RequestUser },
  ) {
    this.requireAnyRole(req.user);

    return this.ratingsService.findFighterEloRatings(fighterId);
  }

  @Post('russia-hmb/calculate')
  calculateRussiaHmbRating(
    @Body() dto: CalculateRussiaHmbRatingDto,
    @Req() req: { user?: RequestUser },
  ) {
    return this.ratingsService.calculateRussiaHmbForTournamentNomination({
      tournamentId: dto.tournament_id,
      nominationId: dto.nomination_id,
      coefficient: dto.coefficient,
      user: req.user,
    });
  }

  @Public()
  @Get('russia-hmb/tournament/:tournamentId/:nominationId')
  findRussiaHmbTournamentNomination(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('nominationId', ParseIntPipe) nominationId: number,
  ) {
    return this.ratingsService.findRussiaHmbByTournamentNomination(
      tournamentId,
      nominationId,
    );
  }

  @Public()
  @Get('russia-hmb/years')
  findRussiaHmbYears() {
    return this.ratingsService.findRussiaHmbYears();
  }

  @Public()
  @Get('russia-hmb/years/:year/nominations')
  findRussiaHmbNominationsByYear(@Param('year', ParseIntPipe) year: number) {
    return this.ratingsService.findRussiaHmbNominationsByYear(year);
  }

  @Public()
  @Get('russia-hmb/years/:year/nomination/:nominationId')
  findRussiaHmbLeaderboard(
    @Param('year', ParseIntPipe) year: number,
    @Param('nominationId', ParseIntPipe) nominationId: number,
  ) {
    return this.ratingsService.findRussiaHmbLeaderboard(year, nominationId);
  }

  @Public()
  @Get('russia-hmb/fighter/:fighterId/profile')
  findRussiaHmbFighterProfile(
    @Param('fighterId', ParseIntPipe) fighterId: number,
  ) {
    return this.ratingsService.findRussiaHmbFighterProfile(fighterId);
  }

  private requireAnyRole(user?: RequestUser) {
    if (!user?.is_admin && !user?.is_organizer && !user?.is_secretary) {
      throw new ForbiddenException('Assigned role required');
    }
  }
}
