import { Controller, Get } from '@nestjs/common';
import { NominationsService } from './nominations.service';
import { API_ROUTES } from '@shared/routes';

@Controller(API_ROUTES.NOMINATIONS.ROOT as string)
export class NominationsController {
  constructor(private readonly nominationsService: NominationsService) {}

  @Get()
  findAll() {
    return this.nominationsService.findAll();
  }
}
