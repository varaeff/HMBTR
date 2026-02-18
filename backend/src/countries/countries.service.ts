import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCountryDto } from './dto/create-country.dto';

@Injectable()
export class CountriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.countries.findMany();
  }

  async getCount() {
    return this.prisma.countries.count();
  }

  async findOne(id: number) {
    const country = await this.prisma.countries.findUnique({
      where: { id },
    });
    if (!country) throw new NotFoundException('Country not found');
    return country;
  }

  async create(dto: CreateCountryDto) {
    const exists = await this.prisma.countries.findFirst({
      where: { name: dto.name },
      select: { id: true },
    });

    if (exists) throw new BadRequestException('Country already exists');

    return this.prisma.countries.create({
      data: { name: dto.name },
    });
  }
}
