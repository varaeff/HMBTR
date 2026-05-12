import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import { GroupCompetitorsService } from './group-competitors.service';
import { AddGroupCompetitorDto } from './dto/add-group-competitor.dto';
import { API_ROUTES } from '@shared/routes';
import { Public } from '../auth/decorators/public.decorator';

@Controller(API_ROUTES.GROUP_COMPETITORS.ROOT)
export class GroupCompetitorsController {
  constructor(
    private readonly groupCompetitorsService: GroupCompetitorsService,
  ) {}

  @Post()
  add(@Body() addGroupCompetitorDto: AddGroupCompetitorDto) {
    return this.groupCompetitorsService.add(addGroupCompetitorDto);
  }

  @Public()
  @Get()
  findAll() {
    return this.groupCompetitorsService.findAll();
  }

  @Public()
  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.groupCompetitorsService.findById(id);
  }

  @Public()
  @Get('group/:groupId')
  findByGroup(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.groupCompetitorsService.findByGroup(groupId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.groupCompetitorsService.remove(id);
  }
}
