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
import { NominationsService } from './nominations.service';
import { API_ROUTES } from '@shared/routes';
import { Public } from '../auth/decorators/public.decorator';
import { CreateNominationDto } from './dto/create-nomination.dto';
import { UpdateNominationDto } from './dto/update-nomination.dto';

interface RequestUser {
  is_admin?: boolean;
}

@Controller(API_ROUTES.NOMINATIONS.ROOT as string)
export class NominationsController {
  constructor(private readonly nominationsService: NominationsService) {}

  @Public()
  @Get()
  findAll() {
    return this.nominationsService.findAll();
  }

  @Post()
  create(
    @Body() dto: CreateNominationDto,
    @Req() req: { user?: RequestUser },
  ) {
    this.requireAdmin(req.user);

    return this.nominationsService.create(dto);
  }

  @Patch(API_ROUTES.NOMINATIONS.BY_ID_PATH)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNominationDto,
    @Req() req: { user?: RequestUser },
  ) {
    this.requireAdmin(req.user);

    return this.nominationsService.update(id, dto);
  }

  @Delete(API_ROUTES.NOMINATIONS.BY_ID_PATH)
  delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: RequestUser },
  ) {
    this.requireAdmin(req.user);

    return this.nominationsService.delete(id);
  }

  private requireAdmin(user?: RequestUser) {
    if (!user?.is_admin) {
      throw new ForbiddenException('Administrator access required');
    }
  }
}
