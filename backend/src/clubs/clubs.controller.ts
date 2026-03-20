import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { CreateClubDto } from './dto/create-club.dto';
import { API_ROUTES } from '@shared/routes';
import { Public } from '../auth/decorators/public.decorator';

@Controller(API_ROUTES.CLUBS.ROOT)
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Public()
  @Get()
  findAall() {
    return this.clubsService.findAll();
  }

  @Public()
  @Get(API_ROUTES.CLUBS.COUNT as string)
  getClubsCount() {
    return this.clubsService.getCount();
  }

  @Public()
  @Get(API_ROUTES.CLUBS.ONE + '/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clubsService.findOne(id);
  }

  @Post()
  create(@Body() createClubDto: CreateClubDto) {
    return this.clubsService.create(createClubDto);
  }
}
