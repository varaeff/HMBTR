import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCityDto } from './dto/create-city.dto';

@Injectable()
export class CitiesService {
  constructor(private prisma: PrismaService) {}

  async findByCountry(id: number) {
    return this.prisma.cities.findMany({
      where: { country_id: id },
    });
  }

  async findOne(id: number) {
    const city = await this.prisma.cities.findUnique({ where: { id } });
    if (!city) throw new NotFoundException('City not found');
    return city;
  }

  async create(dto: CreateCityDto) {
    const exists = await this.prisma.cities.findFirst({
      where: {
        name: dto.name,
        country_id: dto.country_id,
      },
      select: { id: true },
    });

    if (exists) throw new BadRequestException('City already exists');

    return this.prisma.cities.create({
      data: dto,
    });
  }
}
