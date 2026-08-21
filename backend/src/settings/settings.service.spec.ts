import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SettingsService', () => {
  const createService = () => {
    const prisma = {
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
    };

    return {
      prisma,
      service: new SettingsService(prisma as unknown as PrismaService),
    };
  };

  it('creates missing minsport report settings singleton on read', async () => {
    const { prisma, service } = createService();
    const created = {
      id: 1,
      organization_name: '',
      organization_address: '',
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
    };
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([created]);
    prisma.$executeRaw.mockResolvedValue(undefined);

    await expect(service.getMinsportReportSettings()).resolves.toEqual(created);

    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('updates minsport report settings and returns stored values', async () => {
    const { prisma, service } = createService();
    const updated = {
      id: 1,
      organization_name: 'Organization',
      organization_address: 'Address',
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
    };
    prisma.$executeRaw.mockResolvedValue(undefined);
    prisma.$queryRaw.mockResolvedValue([updated]);

    await expect(
      service.updateMinsportReportSettings({
        organization_name: 'Organization',
        organization_address: 'Address',
      }),
    ).resolves.toEqual(updated);

    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
