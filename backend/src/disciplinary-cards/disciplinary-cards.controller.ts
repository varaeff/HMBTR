import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { API_ROUTES } from '@shared/routes';
import { Public } from '../auth/decorators/public.decorator';
import { DisciplinaryCardsService } from './disciplinary-cards.service';
import { CreateDisciplinaryCardDto } from './dto/create-disciplinary-card.dto';
import { UpdateDisciplinaryCardDto } from './dto/update-disciplinary-card.dto';

interface RequestUser {
  is_admin?: boolean;
  is_organizer?: boolean;
  is_secretary?: boolean;
}

@Controller(API_ROUTES.DISCIPLINARY_CARDS.ROOT)
export class DisciplinaryCardsController {
  constructor(
    private readonly disciplinaryCardsService: DisciplinaryCardsService,
  ) {}

  @Public()
  @Get('fighter/:fighterId')
  findByFighter(@Param('fighterId', ParseIntPipe) fighterId: number) {
    return this.disciplinaryCardsService.findByFighter(fighterId);
  }

  @Public()
  @Get('tournament/:tournamentId/active')
  findActiveByTournament(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
  ) {
    return this.disciplinaryCardsService.findActiveForTournament(tournamentId);
  }

  @Public()
  @Get('tournament/:tournamentId')
  findByTournament(@Param('tournamentId', ParseIntPipe) tournamentId: number) {
    return this.disciplinaryCardsService.findByTournament(tournamentId);
  }

  @Post()
  create(
    @Body() dto: CreateDisciplinaryCardDto,
    @Req() req: { user?: RequestUser },
  ) {
    this.requireCardManager(req.user);

    return this.disciplinaryCardsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDisciplinaryCardDto,
    @Req() req: { user?: RequestUser },
  ) {
    this.requireCardEditor(req.user);

    return this.disciplinaryCardsService.update(id, dto);
  }

  @Delete(':id')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: RequestUser },
  ) {
    this.requireCardManager(req.user);

    return this.disciplinaryCardsService.delete(id);
  }

  private requireCardManager(user?: RequestUser) {
    if (!user?.is_admin && !user?.is_organizer && !user?.is_secretary) {
      throw new ForbiddenException(
        'Organizer, secretary or administrator access required',
      );
    }
  }

  private requireCardEditor(user?: RequestUser) {
    if (!user?.is_admin && !user?.is_secretary) {
      throw new ForbiddenException(
        'Secretary or administrator access required',
      );
    }
  }
}
