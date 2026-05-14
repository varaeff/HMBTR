import { NotFoundException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { TournamentsService } from './tournaments.service';

describe('TournamentsService', () => {
  const createService = () => {
    const prisma = {
      tournament_nominations: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    return {
      prisma,
      service: new TournamentsService(prisma as any),
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
});
