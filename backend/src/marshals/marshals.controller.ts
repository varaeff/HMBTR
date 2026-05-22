import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { API_ROUTES } from '@shared/routes';
import { Public } from '../auth/decorators/public.decorator';
import { MarshalsService } from './marshals.service';
import { CreateMarshalDto } from './dto/create-marshal.dto';
import { UpdateMarshalDto } from './dto/update-marshal.dto';

interface RequestWithUser {
  user?: {
    is_admin?: boolean;
    is_secretary?: boolean;
  };
}

const assertCanManageMarshals = (req: RequestWithUser) => {
  if (!req.user?.is_admin && !req.user?.is_secretary) {
    throw new ForbiddenException('Secretary or administrator access required');
  }
};

@Controller(API_ROUTES.MARSHALS.ROOT)
export class MarshalsController {
  constructor(private readonly marshalsService: MarshalsService) {}

  @Public()
  @Get()
  findAll() {
    return this.marshalsService.findAll();
  }

  @Public()
  @Get(API_ROUTES.MARSHALS.COUNT)
  getCount() {
    return this.marshalsService.getCount();
  }

  @Public()
  @Get(API_ROUTES.MARSHALS.CATEGORIES)
  findCategories() {
    return this.marshalsService.findCategories();
  }

  @Public()
  @Get(API_ROUTES.MARSHALS.BY_ID_PATH)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.marshalsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateMarshalDto, @Req() req: RequestWithUser) {
    assertCanManageMarshals(req);
    return this.marshalsService.create(dto);
  }

  @Put(API_ROUTES.MARSHALS.BY_ID_PATH)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMarshalDto,
    @Req() req: RequestWithUser,
  ) {
    assertCanManageMarshals(req);
    return this.marshalsService.update(id, dto);
  }
}
