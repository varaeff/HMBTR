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
      await this.assertJudgingCorpsComplete(dto.tournament_id);
    }

    return this.prisma.tournament_nominations.update({
      where: { id: nomination.id },
      data: {
        is_open: dto.is_open,
      },
    });
  }

  async deleteNomination(tournamentId: number, nominationId: number) {
    return this.prisma.$transaction(async (tx) => {
      const nomination = await tx.tournament_nominations.findFirst({
        where: {
          tournament_id: tournamentId,
          nomination_id: nominationId,
        },
      });

      if (!nomination) throw new NotFoundException('Nomination not found');

      const [nominationCount, competitorCount] = await Promise.all([
        tx.tournament_nominations.count({
          where: { tournament_id: tournamentId },
        }),
        tx.competitors.count({
          where: {
            tournament_id: tournamentId,
            nomination_id: nominationId,
          },
        }),
      ]);

      if (nominationCount <= 1) {
        throw new BadRequestException(
          'Cannot delete the only tournament nomination',
        );
      }

      if (competitorCount > 0) {
        throw new BadRequestException(
          'Cannot delete nomination with registered competitors',
        );
      }

      return tx.tournament_nominations.delete({
        where: { id: nomination.id },
      });
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

  private async assertJudgingCorpsComplete(tournamentId: number) {
    const tournament = await this.prisma.tournaments.findUnique({
      where: { id: tournamentId },
      select: {
        secretary_name: true,
        marshals: {
          select: {
            id: true,
            is_chief_judge: true,
          },
        },
      },
    });

    if (!tournament) throw new NotFoundException('Tournament not found');

    if (!tournament.marshals.length) {
      throw new BadRequestException(
        'Add marshals before closing registration',
      );
    }

    const chiefJudges = tournament.marshals.filter(
      (marshal) => marshal.is_chief_judge,
    );
    if (chiefJudges.length !== 1) {
      throw new BadRequestException(
        'Select a chief judge before closing registration',
      );
    }

    if (!tournament.secretary_name?.trim()) {
      throw new BadRequestException(
        'Add tournament secretary before closing registration',
      );
    }
  }
}
