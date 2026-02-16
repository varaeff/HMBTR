import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClubDto } from './dto/create-club.dto';

@Injectable()
export class ClubsService {
  constructor(private prisma: PrismaService) {}

  async findByCity(id: number) {
    return this.prisma.clubs.findMany({
      where: { city_id: id },
    });
  }

  async findOne(id: number) {
    const club = await this.prisma.clubs.findUnique({ where: { id } });
    if (!club) throw new NotFoundException('Club not found');
    return club;
  }

  async create(dto: CreateClubDto) {
    const exists = await this.prisma.clubs.findFirst({
      where: {
        name: dto.name,
        city_id: dto.city_id,
      },
      select: { id: true },
    });

    if (exists) throw new BadRequestException('Club already exists');

    return this.prisma.clubs.create({
      data: dto,
    });
  }
}
