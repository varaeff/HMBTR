import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { FightsService } from './fights.service';
import { CreateFightDto } from './dto/create-fight.dto';
import { UpdateFightScoresDto } from './dto/update-fight-scores.dto';
import { SetFightWinnerDto } from './dto/set-fight-winner.dto';
import { API_ROUTES } from '@shared/routes';
import { Public } from '../auth/decorators/public.decorator';

@Controller(API_ROUTES.FIGHTS.ROOT)
export class FightsController {
  constructor(private readonly fightsService: FightsService) {}

  @Post()
  create(@Body() createFightDto: CreateFightDto) {
    return this.fightsService.create(createFightDto);
  }

  @Public()
  @Get()
  findAll() {
    return this.fightsService.findAll();
  }

  @Public()
  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.fightsService.findById(id);
  }

  @Public()
  @Get('tournament/:tournamentId')
  findByTournament(@Param('tournamentId', ParseIntPipe) tournamentId: number) {
    return this.fightsService.findByTournament(tournamentId);
  }

  @Public()
  @Get('group/:groupId')
  findByGroup(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.fightsService.findByGroup(groupId);
  }

  @Patch('scores')
  updateScores(@Body() updateFightScoresDto: UpdateFightScoresDto) {
    return this.fightsService.updateScores(updateFightScoresDto);
  }

  @Patch('winner')
  setWinner(@Body() setFightWinnerDto: SetFightWinnerDto) {
    return this.fightsService.setWinner(setFightWinnerDto);
  }

  @Patch(':id/finish')
  finishFight(@Param('id', ParseIntPipe) id: number) {
    return this.fightsService.finishFight(id);
  }
}
