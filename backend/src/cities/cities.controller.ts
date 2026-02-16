import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { CitiesService } from './cities.service';
import { CreateCityDto } from './dto/create-city.dto';
import { API_ROUTES } from '@shared/routes';

@Controller(API_ROUTES.CITIES.ROOT)
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get(':countryId')
  findByCountry(@Param('countryId', ParseIntPipe) countryId: number) {
    return this.citiesService.findByCountry(countryId);
  }

  @Get(API_ROUTES.CITIES.ONE + '/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.citiesService.findOne(id);
  }

  @Post()
  create(@Body() createCityDto: CreateCityDto) {
    return this.citiesService.create(createCityDto);
  }
}
