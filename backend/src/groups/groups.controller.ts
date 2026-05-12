import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Patch,
  Delete,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { API_ROUTES } from '@shared/routes';
import { Public } from '../auth/decorators/public.decorator';

@Controller(API_ROUTES.GROUPS.ROOT)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.create(createGroupDto);
  }

  @Public()
  @Get()
  findAll() {
    return this.groupsService.findAll();
  }

  @Public()
  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.findById(id);
  }

  @Public()
  @Get('tournament/:tournamentId')
  findByTournament(@Param('tournamentId', ParseIntPipe) tournamentId: number) {
    return this.groupsService.findByTournament(tournamentId);
  }

  @Public()
  @Get('tournament/:tournamentId/nomination/:nominationId')
  findByTournamentAndNomination(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Param('nominationId', ParseIntPipe) nominationId: number,
  ) {
    return this.groupsService.findByTournamentAndNomination(
      tournamentId,
      nominationId,
    );
  }

  @Patch(':id')
  update(@Body() updateGroupDto: UpdateGroupDto) {
    return this.groupsService.update(updateGroupDto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.delete(id);
  }
}
