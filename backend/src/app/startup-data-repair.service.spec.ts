import { PrismaService } from '../prisma/prisma.service';
import { StartupDataRepairService } from './startup-data-repair.service';

describe('StartupDataRepairService', () => {
  it('runs chief judge backfill on application bootstrap', async () => {
    const prisma = {
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    const service = new StartupDataRepairService(
      prisma as unknown as PrismaService,
    );

    await service.onApplicationBootstrap();

    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    const queryText = String(prisma.$executeRaw.mock.calls[0]?.[0]?.[0] ?? '');
    expect(queryText).toContain('tournaments_without_chief');
    expect(queryText).toContain('MIN("id")');
    expect(queryText).toContain('"is_chief_judge" = TRUE');
  });
});
