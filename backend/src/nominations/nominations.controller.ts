import { Controller, Get } from '@nestjs/common';
import { NominationsService } from './nominations.service';
import { API_ROUTES } from '@shared/routes';
import { Public } from '../auth/decorators/public.decorator';

@Controller(API_ROUTES.NOMINATIONS.ROOT as string)
export class NominationsController {
  constructor(private readonly nominationsService: NominationsService) {}

  @Public()
  @Get()
  findAll() {
    return this.nominationsService.findAll();
  }
}
