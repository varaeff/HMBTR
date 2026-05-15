import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFighterDto } from './dto/create-fighter.dto';
import { UpdateFighterDto } from './dto/update-fighter.dto';

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
        club_id: dto.club_id || null,
        birthday: dto.birthday ? new Date(dto.birthday) : undefined,
      },
    });
  }

  async update(id: number, dto: UpdateFighterDto) {
    const current = await this.findOne(id);

    if (dto.name || dto.surname || dto.country_id) {
      const exists = await this.prisma.fighters.findFirst({
        where: {
          id: { not: id },
          name: dto.name ?? current.name,
          surname: dto.surname ?? current.surname,
          country_id: dto.country_id ?? current.country_id,
        },
        select: { id: true },
      });

      if (exists) throw new BadRequestException('Fighter already exists');
    }

    return this.prisma.fighters.update({
      where: { id },
      data: {
        ...dto,
        birthday: dto.birthday ? new Date(dto.birthday) : dto.birthday,
        club_id: dto.club_id === undefined ? undefined : dto.club_id || null,
      },
    });
  }
}
