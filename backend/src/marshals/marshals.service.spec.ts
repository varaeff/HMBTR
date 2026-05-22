import { BadRequestException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from '../prisma/prisma.service';
import { MarshalsService } from './marshals.service';

describe('MarshalsService', () => {
  const createService = () => {
    const prisma = {
      marshals: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      marshals_categories: {
        findUnique: jest.fn(),
      },
    };

    return {
      prisma,
      service: new MarshalsService(prisma as unknown as PrismaService),
    };
  };

  it('creates a marshal when category exists and duplicate is absent', async () => {
    const { prisma, service } = createService();
    prisma.marshals_categories.findUnique.mockResolvedValue({ id: 7 });
    prisma.marshals.findFirst.mockResolvedValue(null);
    prisma.marshals.create.mockResolvedValue({ id: 11, name: 'John' });

    await expect(
      service.create({
        name: 'John',
        surname: 'Smith',
        country_id: 1,
        city_id: 2,
        category_id: 7,
      }),
    ).resolves.toMatchObject({ id: 11 });

    expect(prisma.marshals.create).toHaveBeenCalledWith({
      data: {
        name: 'John',
        surname: 'Smith',
        country_id: 1,
        city_id: 2,
        category_id: 7,
      },
      include: { category: true },
    });
  });

  it('rejects marshal creation without an existing category', async () => {
    const { prisma, service } = createService();
    prisma.marshals_categories.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        name: 'John',
        surname: 'Smith',
        country_id: 1,
        city_id: 2,
        category_id: 7,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate marshal by name, surname and country', async () => {
    const { prisma, service } = createService();
    prisma.marshals_categories.findUnique.mockResolvedValue({ id: 7 });
    prisma.marshals.findFirst.mockResolvedValue({ id: 11 });

    await expect(
      service.create({
        name: 'John',
        surname: 'Smith',
        country_id: 1,
        city_id: 2,
        category_id: 7,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
