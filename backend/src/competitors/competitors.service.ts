import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompetitorDto } from './dto/create-competitor.dto';
import { DisciplinaryCardsService } from '../disciplinary-cards/disciplinary-cards.service';

@Injectable()
export class CompetitorsService {
  constructor(
    private prisma: PrismaService,
    private disciplinaryCardsService: DisciplinaryCardsService,
  ) {}

  async addCompetitor(dto: CreateCompetitorDto) {
    // Verify that fighter, tournament, and nomination exist
    const [fighter, tournament, nomination, tournamentNomination] =
      await Promise.all([
        this.prisma.fighters.findUnique({ where: { id: dto.fighter_id } }),
        this.prisma.tournaments.findUnique({
          where: { id: dto.tournament_id },
        }),
        this.prisma.nominations.findUnique({
          where: { id: dto.nomination_id },
        }),
        this.prisma.tournament_nominations.findFirst({
          where: {
            tournament_id: dto.tournament_id,
            nomination_id: dto.nomination_id,
          },
        }),
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
    if (fighter.is_male !== nomination.is_male) {
      throw new BadRequestException('Fighter gender does not match nomination');
    }
    if (!tournamentNomination?.is_open) {
      throw new BadRequestException(
        'Nomination registration is not open for this tournament',
      );
    }
    if (
      await this.disciplinaryCardsService.hasActiveRedForTournament(
        dto.fighter_id,
        dto.tournament_id,
      )
    ) {
      throw new BadRequestException(
        'Fighter has an active red card for this tournament',
      );
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

  async getRegistrationEligibility(tournamentId: number) {
    const [openNominations, competitors, fighters, activeRedFighterIds] =
      await Promise.all([
        this.prisma.tournament_nominations.findMany({
          where: {
            tournament_id: tournamentId,
            is_open: true,
          },
          select: {
            nomination_id: true,
            nomination: {
              select: {
                is_male: true,
              },
            },
          },
        }),
        this.prisma.competitors.findMany({
          where: {
            tournament_id: tournamentId,
          },
          select: {
            fighter_id: true,
            nomination_id: true,
          },
        }),
        this.prisma.fighters.findMany({
          select: {
            id: true,
            is_male: true,
          },
        }),
        this.disciplinaryCardsService.getActiveRedFighterIdsForTournament(
          tournamentId,
        ),
      ]);

    const activeRedFighterIdSet = new Set(activeRedFighterIds);
    const existingRegistrationKeys = new Set(
      competitors.map(
        (competitor) =>
          `${competitor.fighter_id}:${competitor.nomination_id}`,
      ),
    );

    return fighters.flatMap((fighter) => {
      if (activeRedFighterIdSet.has(fighter.id)) return [];

      const nominationIds = openNominations
        .filter(
          (tournamentNomination) =>
            tournamentNomination.nomination.is_male === fighter.is_male &&
            !existingRegistrationKeys.has(
              `${fighter.id}:${tournamentNomination.nomination_id}`,
            ),
        )
        .map((tournamentNomination) => tournamentNomination.nomination_id);

      return nominationIds.length
        ? [{ fighter_id: fighter.id, nomination_ids: nominationIds }]
        : [];
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
