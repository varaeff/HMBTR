import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { CountriesService } from './countries.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { API_ROUTES } from '@shared/routes';
import { Public } from '../auth/decorators/public.decorator';

@Controller(API_ROUTES.COUNTRIES.ROOT)
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Public()
  @Get()
  findAll() {
    return this.countriesService.findAll();
  }

  @Public()
  @Get(API_ROUTES.COUNTRIES.COUNT as string)
  getCountriesCount() {
    return this.countriesService.getCount();
  }

  @Public()
  @Get(API_ROUTES.COUNTRIES.ONE + '/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.countriesService.findOne(id);
  }

  @Post()
  create(@Body() createCountryDto: CreateCountryDto) {
    return this.countriesService.create(createCountryDto);
  }
}
