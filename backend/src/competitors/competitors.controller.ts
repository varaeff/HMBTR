import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { CompetitorsService } from './competitors.service';
import { CreateCompetitorDto } from './dto/create-competitor.dto';
import { API_ROUTES } from '@shared/routes';
import { Public } from '../auth/decorators/public.decorator';

@Controller(API_ROUTES.COMPETITORS.ROOT)
export class CompetitorsController {
  constructor(private readonly competitorsService: CompetitorsService) {}

  @Post()
  addCompetitor(@Body() createCompetitorDto: CreateCompetitorDto) {
    return this.competitorsService.addCompetitor(createCompetitorDto);
  }

  @Delete(':id')
  deleteCompetitor(@Param('id', ParseIntPipe) id: number) {
    return this.competitorsService.deleteCompetitor(id);
  }

  @Public()
  @Get(':tournamentId')
  getTournamentCompetitors(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
  ) {
    return this.competitorsService.getTournamentCompetitors(tournamentId);
  }

  @Public()
  @Get(':tournamentId/:nominationId')
  getNominationCompetitors(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('nominationId', ParseIntPipe) nominationId: number,
  ) {
    return this.competitorsService.getNominationCompetitors(
      tournamentId,
      nominationId,
    );
  }
}
