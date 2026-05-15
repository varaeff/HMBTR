import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  ParseIntPipe,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { FightersService } from './fighters.service';
import { CreateFighterDto } from './dto/create-fighter.dto';
import { UpdateFighterDto } from './dto/update-fighter.dto';
import { API_ROUTES } from '@shared/routes';
import { Public } from '../auth/decorators/public.decorator';

@Controller(API_ROUTES.FIGHTERS.ROOT)
export class FightersController {
  constructor(private readonly fightersService: FightersService) {}

  @Public()
  @Get()
  getFighters() {
    return this.fightersService.findAll();
  }

  @Public()
  @Get(API_ROUTES.FIGHTERS.COUNT)
  getFightersCount() {
    return this.fightersService.getCount();
  }

  @Public()
  @Get(':id')
  getFighter(@Param('id', ParseIntPipe) id: number) {
    return this.fightersService.findOne(id);
  }

  @Post()
  addFighter(@Body() dto: CreateFighterDto) {
    return this.fightersService.create(dto);
  }

  @Put(API_ROUTES.FIGHTERS.BY_ID_PATH)
  updateFighter(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFighterDto,
    @Req() req: { user?: { is_admin?: boolean } },
  ) {
    if (!req.user?.is_admin) {
      throw new ForbiddenException('Administrator access required');
    }

    return this.fightersService.update(id, dto);
  }
}
