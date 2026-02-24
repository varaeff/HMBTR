import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { API_ROUTES } from '@shared/routes';
import { AddNominationDto } from './dto/add-nomination.dto';

@Controller(API_ROUTES.TOURNAMENTS.ROOT)
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Get()
  findAll() {
    return this.tournamentsService.findAll();
  }

  @Get(API_ROUTES.TOURNAMENTS.COUNT)
  getCount() {
    return this.tournamentsService.getCount();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tournamentsService.findOne(id);
  }

  @Post()
  create(@Body() createTournamentDto: CreateTournamentDto) {
    return this.tournamentsService.create(createTournamentDto);
  }

  @Get(API_ROUTES.TOURNAMENTS.NOMINATION + '/:id')
  getNominations(@Param('id', ParseIntPipe) id: number) {
    return this.tournamentsService.getNominations(id);
  }

  @Post(API_ROUTES.TOURNAMENTS.NOMINATION)
  addNomination(@Body() addNominationDto: AddNominationDto) {
    return this.tournamentsService.addNomination(addNominationDto);
  }
}
