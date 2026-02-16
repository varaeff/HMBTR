import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFighterDto } from './dto/create-fighter.dto';

@Injectable()
export class FightersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.fighters.findMany();
  }

  async getCount() {
    return this.prisma.fighters.count();
  }

  async findOne(id: number) {
    const fighter = await this.prisma.fighters.findUnique({ where: { id } });
    if (!fighter) throw new NotFoundException('Fighter not found');
    return fighter;
  }

  async create(dto: CreateFighterDto) {
    const exists = await this.prisma.fighters.findFirst({
      where: {
        name: dto.name,
        surname: dto.surname,
        country_id: dto.country_id,
      },
      select: { id: true },
    });

    if (exists) throw new BadRequestException('Fighter already exists');

    return this.prisma.fighters.create({
      data: {
        ...dto,
        birthday: dto.birthday ? new Date(dto.birthday) : undefined,
      },
    });
  }
}
