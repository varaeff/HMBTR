import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { FightersService } from './fighters.service';
import { CreateFighterDto } from './dto/create-fighter.dto';
import { API_ROUTES } from '@shared/routes';

@Controller(API_ROUTES.FIGHTERS.ROOT)
export class FightersController {
  constructor(private readonly fightersService: FightersService) {}

  @Get()
  getFighters() {
    return this.fightersService.findAll();
  }

  @Get(API_ROUTES.FIGHTERS.COUNT)
  getFightersCount() {
    return this.fightersService.getCount();
  }

  @Get(':id')
  getFighter(@Param('id', ParseIntPipe) id: number) {
    return this.fightersService.findOne(id);
  }

  @Post()
  addFighter(@Body() dto: CreateFighterDto) {
    return this.fightersService.create(dto);
  }
}
