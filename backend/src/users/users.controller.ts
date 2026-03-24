import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { API_ROUTES } from '@shared/routes';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller(API_ROUTES.USERS.ROOT)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Public()
  @Get(API_ROUTES.USERS.ADMINS)
  findAllAdmins() {
    return this.usersService.findAllAdmins();
  }

  @UseGuards(JwtAuthGuard)
  @Put(API_ROUTES.USERS.BY_ID_PATH)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateById(id, updateUserDto);
  }
}
