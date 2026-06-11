import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DisciplinaryCardsService } from '../disciplinary-cards/disciplinary-cards.service';
import { CompetitorsService } from './competitors.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('../disciplinary-cards/disciplinary-cards.service', () => ({
  DisciplinaryCardsService: class DisciplinaryCardsService {},
}));

describe('CompetitorsService', () => {
  const createService = () => {
    const prisma = {
      competitors: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      fighters: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      nominations: {
        findUnique: jest.fn(),
      },
      tournament_nominations: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      tournaments: {
        findUnique: jest.fn(),
      },
    };
    const disciplinaryCardsService = {
      hasActiveRedForTournament: jest.fn(),
      getActiveRedFighterIdsForTournament: jest.fn(),
    };

    return {
      prisma,
      disciplinaryCardsService,
      service: new CompetitorsService(
        prisma as unknown as PrismaService,
        disciplinaryCardsService as unknown as DisciplinaryCardsService,
      ),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns only fighters with available open nominations', async () => {
    const { prisma, disciplinaryCardsService, service } = createService();
    prisma.tournament_nominations.findMany.mockResolvedValue([
      { nomination_id: 1, nomination: { is_male: true } },
      { nomination_id: 2, nomination: { is_male: true } },
      { nomination_id: 3, nomination: { is_male: false } },
    ]);
    prisma.competitors.findMany.mockResolvedValue([
      { fighter_id: 10, nomination_id: 1 },
      { fighter_id: 30, nomination_id: 3 },
    ]);
    prisma.fighters.findMany.mockResolvedValue([
      { id: 10, is_male: true },
      { id: 20, is_male: true },
      { id: 30, is_male: false },
      { id: 40, is_male: false },
    ]);
    disciplinaryCardsService.getActiveRedFighterIdsForTournament.mockResolvedValue(
      [20],
    );

    await expect(service.getRegistrationEligibility(7)).resolves.toEqual([
      { fighter_id: 10, nomination_ids: [2] },
      { fighter_id: 40, nomination_ids: [3] },
    ]);
  });

  it('rejects registration when the tournament nomination is closed', async () => {
    const { prisma, service } = createService();
    prisma.fighters.findUnique.mockResolvedValue({ id: 10, is_male: true });
    prisma.tournaments.findUnique.mockResolvedValue({ id: 7 });
    prisma.nominations.findUnique.mockResolvedValue({ id: 2, is_male: true });
    prisma.tournament_nominations.findFirst.mockResolvedValue({
      tournament_id: 7,
      nomination_id: 2,
      is_open: false,
    });

    await expect(
      service.addCompetitor({
        fighter_id: 10,
        tournament_id: 7,
        nomination_id: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
