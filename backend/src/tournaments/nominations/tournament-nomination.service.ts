import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddNominationDto } from '../dto/add-nomination.dto';
import { UpdateNominationDto } from '../dto/update-nomination.dto';
import { UpdateNominationStageDto } from '../dto/update-nomination-stage.dto';

@Injectable()
export class TournamentNominationService {
  constructor(private readonly prisma: PrismaService) {}

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

  async updateNomination(dto: UpdateNominationDto) {
    const nomination = await this.prisma.tournament_nominations.findFirst({
      where: {
        tournament_id: dto.tournament_id,
        nomination_id: dto.nomination_id,
      },
    });

    if (!nomination) throw new NotFoundException('Nomination not found');

    if (nomination.is_open && !dto.is_open) {
      const tournamentMarshal = await this.prisma.tournament_marshals.findFirst(
        {
          where: { tournament_id: dto.tournament_id },
          select: { id: true },
        },
      );

      if (!tournamentMarshal) {
        throw new BadRequestException(
          'Add marshals before closing registration',
        );
      }
    }

    return this.prisma.tournament_nominations.update({
      where: { id: nomination.id },
      data: {
        is_open: dto.is_open,
      },
    });
  }

  async updateNominationStage(dto: UpdateNominationStageDto) {
    const nomination = await this.prisma.tournament_nominations.findUnique({
      where: { id: dto.nomination_id },
    });

    if (!nomination) throw new NotFoundException('Nomination not found');

    return this.prisma.tournament_nominations.update({
      where: { id: dto.nomination_id },
      data: {
        stage: dto.stage,
      },
    });
  }
}
