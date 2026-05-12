import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddGroupCompetitorDto } from './dto/add-group-competitor.dto';

@Injectable()
export class GroupCompetitorsService {
  constructor(private prisma: PrismaService) {}

  async add(dto: AddGroupCompetitorDto) {
    const group = await this.prisma.groups.findUnique({
      where: { id: dto.group_id },
    });

    if (!group) throw new NotFoundException('Group not found');

    const competitor = await this.prisma.competitors.findUnique({
      where: { id: dto.competitor_id },
    });

    if (!competitor) throw new NotFoundException('Competitor not found');

    const exists = await this.prisma.group_competitors.findFirst({
      where: {
        group_id: dto.group_id,
        competitor_id: dto.competitor_id,
      },
    });

    if (exists)
      throw new BadRequestException('Competitor is already in this group');

    return this.prisma.group_competitors.create({
      data: {
        group_id: dto.group_id,
        competitor_id: dto.competitor_id,
      },
    });
  }

  async findAll() {
    return this.prisma.group_competitors.findMany();
  }

  async findById(id: number) {
    const groupCompetitor = await this.prisma.group_competitors.findUnique({
      where: { id },
    });

    if (!groupCompetitor)
      throw new NotFoundException('Group competitor not found');

    return groupCompetitor;
  }

  async findByGroup(groupId: number) {
    const group = await this.prisma.groups.findUnique({
      where: { id: groupId },
    });

    if (!group) throw new NotFoundException('Group not found');

    return this.prisma.group_competitors.findMany({
      where: { group_id: groupId },
      include: {
        competitor: {
          include: {
            fighter: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    const groupCompetitor = await this.prisma.group_competitors.findUnique({
      where: { id },
    });

    if (!groupCompetitor)
      throw new NotFoundException('Group competitor not found');

    return this.prisma.group_competitors.delete({
      where: { id },
    });
  }
}
