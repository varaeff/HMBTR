import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompetitorDto } from './dto/create-competitor.dto';

@Injectable()
export class CompetitorsService {
  constructor(private prisma: PrismaService) {}

  async addCompetitor(dto: CreateCompetitorDto) {
    // Verify that fighter, tournament, and nomination exist
    const [fighter, tournament, nomination] = await Promise.all([
      this.prisma.fighters.findUnique({ where: { id: dto.fighter_id } }),
      this.prisma.tournaments.findUnique({ where: { id: dto.tournament_id } }),
      this.prisma.nominations.findUnique({ where: { id: dto.nomination_id } }),
    ]);

    if (!fighter) {
      throw new NotFoundException('Fighter not found');
    }
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    if (!nomination) {
      throw new NotFoundException('Nomination not found');
    }

    // Check if competitor already exists
    const exists = await this.prisma.competitors.findFirst({
      where: {
        fighter_id: dto.fighter_id,
        tournament_id: dto.tournament_id,
        nomination_id: dto.nomination_id,
      },
    });

    if (exists) {
      throw new BadRequestException(
        'Competitor already exists in this tournament and nomination',
      );
    }

    return this.prisma.competitors.create({
      data: {
        fighter_id: dto.fighter_id,
        tournament_id: dto.tournament_id,
        nomination_id: dto.nomination_id,
      },
    });
  }

  async deleteCompetitor(id: number) {
    const competitor = await this.prisma.competitors.findUnique({
      where: { id },
    });

    if (!competitor) {
      throw new NotFoundException('Competitor not found');
    }

    return this.prisma.competitors.delete({
      where: { id },
    });
  }

  async getTournamentCompetitors(tournamentId: number) {
    return this.prisma.competitors.findMany({
      where: {
        tournament_id: tournamentId,
      },
    });
  }

  async getNominationCompetitors(tournamentId: number, nominationId: number) {
    return this.prisma.competitors.findMany({
      where: {
        tournament_id: tournamentId,
        nomination_id: nominationId,
      },
    });
  }
}
