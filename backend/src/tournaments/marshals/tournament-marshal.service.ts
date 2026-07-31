import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddTournamentMarshalDto } from '../dto/add-tournament-marshal.dto';

@Injectable()
export class TournamentMarshalService {
  constructor(private readonly prisma: PrismaService) {}

  async getTournamentMarshals(tournamentId: number) {
    await this.assertTournamentExists(tournamentId);

    return this.prisma.tournament_marshals.findMany({
      where: { tournament_id: tournamentId },
      orderBy: { created_at: 'asc' },
      include: {
        marshal: {
          include: {
            category: true,
            country: true,
            city: true,
          },
        },
      },
    });
  }

  async addTournamentMarshal(dto: AddTournamentMarshalDto) {
    const tournament = await this.assertCanChangeTournamentMarshals(
      dto.tournament_id,
    );

    const marshal = await this.prisma.marshals.findUnique({
      where: { id: dto.marshal_id },
      select: { id: true },
    });

    if (!marshal) throw new NotFoundException('Marshal not found');

    const exists = await this.prisma.tournament_marshals.findFirst({
      where: {
        tournament_id: dto.tournament_id,
        marshal_id: dto.marshal_id,
      },
      select: { id: true },
    });

    if (exists) {
      throw new BadRequestException('Marshal already registered');
    }

    const tournamentMarshal = await this.prisma.tournament_marshals.create({
      data: dto,
      include: {
        marshal: {
          include: {
            category: true,
            country: true,
            city: true,
          },
        },
      },
    });

    if (tournament.is_marshals_registration_closed) {
      await this.prisma.tournaments.update({
        where: { id: dto.tournament_id },
        data: { is_marshals_registration_closed: false },
      });
    }

    return tournamentMarshal;
  }

  async deleteTournamentMarshal(id: number) {
    const tournamentMarshal = await this.prisma.tournament_marshals.findUnique({
      where: { id },
    });

    if (!tournamentMarshal) {
      throw new NotFoundException('Tournament marshal not found');
    }

    await this.assertCanChangeTournamentMarshals(
      tournamentMarshal.tournament_id,
    );

    return this.prisma.tournament_marshals.delete({
      where: { id },
    });
  }

  async finishTournamentMarshalRegistration(tournamentId: number) {
    await this.assertTournamentExists(tournamentId);

    const tournamentMarshal = await this.prisma.tournament_marshals.findFirst({
      where: { tournament_id: tournamentId },
      select: { id: true },
    });

    if (!tournamentMarshal) {
      throw new BadRequestException(
        'Add marshals before finishing marshal registration',
      );
    }

    return this.prisma.tournaments.update({
      where: { id: tournamentId },
      data: { is_marshals_registration_closed: true },
    });
  }

  async assertTournamentExists(tournamentId: number) {
    const tournament = await this.prisma.tournaments.findUnique({
      where: { id: tournamentId },
      select: { id: true },
    });

    if (!tournament) throw new NotFoundException('Tournament not found');
  }

  private async assertCanChangeTournamentMarshals(tournamentId: number) {
    const tournament = await this.prisma.tournaments.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        is_marshals_registration_closed: true,
        nominations: {
          select: { is_open: true },
        },
        marshals: {
          select: { id: true },
        },
      },
    });

    if (!tournament) throw new NotFoundException('Tournament not found');

    if (
      tournament.is_marshals_registration_closed &&
      tournament.marshals.length > 0
    ) {
      throw new BadRequestException('Marshal registration is finished');
    }

    if (!tournament.nominations.some((nomination) => nomination.is_open)) {
      throw new BadRequestException('Fighter registration is closed');
    }

    return tournament;
  }
}
