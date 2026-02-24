import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { AddNominationDto } from './dto/add-nomination.dto';

@Injectable()
export class TournamentsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tournaments.findMany();
  }

  async getCount() {
    return this.prisma.tournaments.count();
  }

  async findOne(id: number) {
    const tournament = await this.prisma.tournaments.findUnique({
      where: { id },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');
    return tournament;
  }

  async create(dto: CreateTournamentDto) {
    const eventDate = new Date(dto.event_date);

    const exists = await this.prisma.tournaments.findFirst({
      where: {
        name: dto.name,
        event_date: eventDate,
        city_id: dto.city_id,
      },
      select: { id: true },
    });

    if (exists) throw new BadRequestException('Tournament already exists');

    return this.prisma.tournaments.create({
      data: {
        ...dto,
        event_date: eventDate,
      },
    });
  }

  async getNominations(tournamentId: number) {
    return this.prisma.tournament_nominations.findMany({
      where: { tournament_id: tournamentId },
    });
  }

  async addNomination(dto: AddNominationDto) {
    return this.prisma.tournament_nominations.create({
      data: {
        ...dto,
      },
    });
  }
}
