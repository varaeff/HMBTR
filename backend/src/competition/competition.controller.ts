import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { API_ROUTES } from '@shared/routes';
import { Public } from '../auth/decorators/public.decorator';
import { CompetitionService } from './competition.service';
import { CreateCompetitionBlockDto } from './dto/create-competition-block.dto';
import { FinishCompetitionDto } from './dto/finish-competition.dto';
import { GenerateGroupFightsDto } from './dto/generate-group-fights.dto';
import { ResolveTiesDto } from './dto/resolve-ties.dto';
import { SaveCompetitionResultsDto } from './dto/save-competition-results.dto';
import { SwapBracketSlotsDto } from './dto/swap-bracket-slots.dto';
import { UpdateCompetitionScoreDto } from './dto/update-competition-score.dto';

@Controller(API_ROUTES.COMPETITION.ROOT)
export class CompetitionController {
  constructor(private readonly competitionService: CompetitionService) {}

  @Public()
  @Get(':tournamentId/:nominationId')
  getState(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('nominationId', ParseIntPipe) nominationId: number,
  ) {
    return this.competitionService.getState(tournamentId, nominationId);
  }

  @Post('groups')
  createGroupBlock(@Body() dto: CreateCompetitionBlockDto) {
    return this.competitionService.createGroupBlock(dto);
  }

  @Post('groups/fights')
  generateGroupFights(@Body() dto: GenerateGroupFightsDto) {
    return this.competitionService.generateGroupFights(dto);
  }

  @Post('olympic')
  createOlympicBlock(@Body() dto: CreateCompetitionBlockDto) {
    return this.competitionService.createOlympicBlock(dto);
  }

  @Patch('scores')
  updateScore(@Body() dto: UpdateCompetitionScoreDto) {
    return this.competitionService.updateScore(dto);
  }

  @Patch('results')
  saveResults(@Body() dto: SaveCompetitionResultsDto) {
    return this.competitionService.saveResults(dto);
  }

  @Patch('bracket-slots/swap')
  swapBracketSlots(@Body() dto: SwapBracketSlotsDto) {
    return this.competitionService.swapBracketSlots(dto);
  }

  @Post('resolve-ties')
  resolveTies(@Body() dto: ResolveTiesDto) {
    return this.competitionService.resolveTies(dto);
  }

  @Post('finish')
  finish(@Body() dto: FinishCompetitionDto) {
    return this.competitionService.finish(dto);
  }
}
