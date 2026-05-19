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
  @Get('tournament/:tournamentId')
  findByTournament(@Param('tournamentId', ParseIntPipe) tournamentId: number) {
    return this.disciplinaryCardsService.findByTournament(tournamentId);
  }

  @Post()
  create(
    @Body() dto: CreateDisciplinaryCardDto,
    @Req() req: { user?: RequestUser },
  ) {
    this.requireOrganizer(req.user);

    return this.disciplinaryCardsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDisciplinaryCardDto,
    @Req() req: { user?: RequestUser },
  ) {
    this.requireOrganizer(req.user);

    return this.disciplinaryCardsService.update(id, dto);
  }

  @Delete(':id')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: RequestUser },
  ) {
    if (!req.user?.is_admin) {
      throw new ForbiddenException('Administrator access required');
    }

    return this.disciplinaryCardsService.delete(id);
  }

  private requireOrganizer(user?: RequestUser) {
    if (!user?.is_admin && !user?.is_organizer) {
      throw new ForbiddenException('Organizer access required');
    }
  }
}
