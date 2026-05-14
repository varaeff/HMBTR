import {
  Controller,
  Get,
  Post,
  Body,
  ForbiddenException,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { API_ROUTES } from '@shared/routes';
import { AddNominationDto } from './dto/add-nomination.dto';
import { UpdateNominationDto } from './dto/update-nomination.dto';
import { UpdateNominationStageDto } from './dto/update-nomination-stage.dto';
import { Public } from '../auth/decorators/public.decorator';
import type { Request, Response } from 'express';

interface RequestWithUser extends Request {
  user: {
    is_admin: boolean;
    is_organizer: boolean;
  };
}

const createContentDisposition = (fileName: string) => {
  const safeAsciiFileName =
    fileName
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/[\\"]/g, '')
      .replace(/[\r\n]/g, '')
      .trim() || 'tournament-results.pdf';

  return `attachment; filename="${safeAsciiFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
};

@Controller(API_ROUTES.TOURNAMENTS.ROOT)
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Public()
  @Get()
  findAll() {
    return this.tournamentsService.findAll();
  }

  @Public()
  @Get(API_ROUTES.TOURNAMENTS.COUNT)
  getCount() {
    return this.tournamentsService.getCount();
  }

  @Get(':id/report')
  async downloadReport(
    @Param('id', ParseIntPipe) id: number,
    @Query('lang') language: string | undefined,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    if (!req.user.is_admin && !req.user.is_organizer) {
      throw new ForbiddenException(
        'Organizer or administrator access required',
      );
    }

    const report = await this.tournamentsService.getTournamentReport(
      id,
      language,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', report.pdf.length);
    res.setHeader(
      'Content-Disposition',
      createContentDisposition(report.fileName),
    );
    res.send(report.pdf);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tournamentsService.findOne(id);
  }

  @Post()
  create(@Body() createTournamentDto: CreateTournamentDto) {
    return this.tournamentsService.create(createTournamentDto);
  }

  @Public()
  @Get(API_ROUTES.TOURNAMENTS.NOMINATION + '/:id')
  getNominations(@Param('id', ParseIntPipe) id: number) {
    return this.tournamentsService.getNominations(id);
  }

  @Post(API_ROUTES.TOURNAMENTS.NOMINATION)
  addNomination(@Body() addNominationDto: AddNominationDto) {
    return this.tournamentsService.addNomination(addNominationDto);
  }

  @Post(API_ROUTES.TOURNAMENTS.NOMINATION + '/update')
  updateNomination(@Body() updateNominationDto: UpdateNominationDto) {
    return this.tournamentsService.updateNomination(updateNominationDto);
  }

  @Patch(API_ROUTES.TOURNAMENTS.NOMINATION + '/stage')
  updateNominationStage(
    @Body() updateNominationStageDto: UpdateNominationStageDto,
  ) {
    return this.tournamentsService.updateNominationStage(
      updateNominationStageDto,
    );
  }
}
