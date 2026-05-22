import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMarshalDto } from './dto/create-marshal.dto';
import { UpdateMarshalDto } from './dto/update-marshal.dto';

@Injectable()
export class MarshalsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.marshals.findMany({
      orderBy: [{ surname: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      include: { category: true },
    });
  }

  async getCount() {
    return this.prisma.marshals.count();
  }

  async findCategories() {
    return this.prisma.marshals_categories.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const marshal = await this.prisma.marshals.findUnique({
      where: { id },
      include: {
        category: true,
        tournaments: {
          orderBy: { created_at: 'asc' },
          include: {
            tournament: {
              include: {
                country: true,
                city: true,
              },
            },
          },
        },
      },
    });

    if (!marshal) throw new NotFoundException('Marshal not found');

    return marshal;
  }

  async create(dto: CreateMarshalDto) {
    await this.assertCategoryExists(dto.category_id);

    const exists = await this.prisma.marshals.findFirst({
      where: {
        name: dto.name,
        surname: dto.surname,
        country_id: dto.country_id,
      },
      select: { id: true },
    });

    if (exists) throw new BadRequestException('Marshal already exists');

    return this.prisma.marshals.create({
      data: dto,
      include: { category: true },
    });
  }

  async update(id: number, dto: UpdateMarshalDto) {
    const current = await this.findOne(id);

    if (dto.category_id !== undefined) {
      await this.assertCategoryExists(dto.category_id);
    }

    if (dto.name || dto.surname || dto.country_id) {
      const exists = await this.prisma.marshals.findFirst({
        where: {
          id: { not: id },
          name: dto.name ?? current.name,
          surname: dto.surname ?? current.surname,
          country_id: dto.country_id ?? current.country_id,
        },
        select: { id: true },
      });

      if (exists) throw new BadRequestException('Marshal already exists');
    }

    return this.prisma.marshals.update({
      where: { id },
      data: dto,
      include: { category: true },
    });
  }

  private async assertCategoryExists(categoryId: number) {
    const category = await this.prisma.marshals_categories.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) throw new BadRequestException('Marshal category not found');
  }
}
