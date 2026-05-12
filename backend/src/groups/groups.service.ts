import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateGroupDto) {
    const tournament = await this.prisma.tournaments.findUnique({
      where: { id: dto.tournament_id },
    });

    if (!tournament) throw new NotFoundException('Tournament not found');

    const nomination = await this.prisma.nominations.findUnique({
      where: { id: dto.nomination_id },
    });

    if (!nomination) throw new NotFoundException('Nomination not found');

    return this.prisma.groups.create({
      data: {
        tournament_id: dto.tournament_id,
        nomination_id: dto.nomination_id,
        name: dto.name,
        stage: dto.stage,
      },
    });
  }

  async findAll() {
    return this.prisma.groups.findMany();
  }

  async findById(id: number) {
    const group = await this.prisma.groups.findUnique({
      where: { id },
    });

    if (!group) throw new NotFoundException('Group not found');

    return group;
  }

  async findByTournament(tournamentId: number) {
    return this.prisma.groups.findMany({
      where: { tournament_id: tournamentId },
    });
  }

  async findByTournamentAndNomination(
    tournamentId: number,
    nominationId: number,
  ) {
    return this.prisma.groups.findMany({
      where: {
        tournament_id: tournamentId,
        nomination_id: nominationId,
      },
    });
  }

  async update(dto: UpdateGroupDto) {
    const group = await this.prisma.groups.findUnique({
      where: { id: dto.id },
    });

    if (!group) throw new NotFoundException('Group not found');

    return this.prisma.groups.update({
      where: { id: dto.id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.stage !== undefined && { stage: dto.stage }),
      },
    });
  }

  async delete(id: number) {
    const group = await this.prisma.groups.findUnique({
      where: { id },
    });

    if (!group) throw new NotFoundException('Group not found');

    return this.prisma.groups.delete({
      where: { id },
    });
  }
}
