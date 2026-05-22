import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { TournamentsService } from './tournaments.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TournamentsService', () => {
  const createService = () => {
    const prisma = {
      tournament_nominations: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      tournaments: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      marshals: {
        findUnique: jest.fn(),
      },
      tournament_marshals: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };

    return {
      prisma,
      service: new TournamentsService(prisma as unknown as PrismaService),
    };
  };

  it('updates nomination open state by tournament and nomination ids', async () => {
    const { prisma, service } = createService();
    prisma.tournament_nominations.findFirst.mockResolvedValue({
      id: 42,
      tournament_id: 31,
      nomination_id: 5,
      is_open: true,
    });
    prisma.tournament_nominations.update.mockResolvedValue({
      id: 42,
      tournament_id: 31,
      nomination_id: 5,
      is_open: false,
    });

    await expect(
      service.updateNomination({
        tournament_id: 31,
        nomination_id: 5,
        is_open: false,
      }),
    ).resolves.toMatchObject({ id: 42, is_open: false });

    expect(prisma.tournament_nominations.findFirst).toHaveBeenCalledWith({
      where: { tournament_id: 31, nomination_id: 5 },
    });
    expect(prisma.tournament_nominations.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { is_open: false },
    });
  });

  it('throws when the tournament nomination pair does not exist', async () => {
    const { prisma, service } = createService();
    prisma.tournament_nominations.findFirst.mockResolvedValue(null);

    await expect(
      service.updateNomination({
        tournament_id: 31,
        nomination_id: 5,
        is_open: false,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('registers a marshal while tournament marshal and fighter registration are open', async () => {
    const { prisma, service } = createService();
    prisma.tournaments.findUnique.mockResolvedValue({
      id: 31,
      is_marshals_registration_closed: false,
      nominations: [{ is_open: true }],
    });
    prisma.marshals.findUnique.mockResolvedValue({ id: 9 });
    prisma.tournament_marshals.findFirst.mockResolvedValue(null);
    prisma.tournament_marshals.create.mockResolvedValue({
      id: 4,
      tournament_id: 31,
      marshal_id: 9,
    });

    await expect(
      service.addTournamentMarshal({ tournament_id: 31, marshal_id: 9 }),
    ).resolves.toMatchObject({ id: 4, marshal_id: 9 });
  });

  it('rejects marshal registration after marshal registration is finished', async () => {
    const { prisma, service } = createService();
    prisma.tournaments.findUnique.mockResolvedValue({
      id: 31,
      is_marshals_registration_closed: true,
      nominations: [{ is_open: true }],
    });

    await expect(
      service.addTournamentMarshal({ tournament_id: 31, marshal_id: 9 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects marshal registration when no fighter nominations are open', async () => {
    const { prisma, service } = createService();
    prisma.tournaments.findUnique.mockResolvedValue({
      id: 31,
      is_marshals_registration_closed: false,
      nominations: [{ is_open: false }],
    });

    await expect(
      service.addTournamentMarshal({ tournament_id: 31, marshal_id: 9 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('finishes marshal registration permanently', async () => {
    const { prisma, service } = createService();
    prisma.tournaments.findUnique.mockResolvedValue({ id: 31 });
    prisma.tournaments.update.mockResolvedValue({
      id: 31,
      is_marshals_registration_closed: true,
    });

    await expect(
      service.finishTournamentMarshalRegistration(31),
    ).resolves.toMatchObject({ is_marshals_registration_closed: true });

    expect(prisma.tournaments.update).toHaveBeenCalledWith({
      where: { id: 31 },
      data: { is_marshals_registration_closed: true },
    });
  });
});
