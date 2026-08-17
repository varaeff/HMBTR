import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NominationsService } from './nominations.service';

const nomination = {
  id: 1,
  name_ru: 'Adults',
  name_en: 'Adults',
  is_male: true,
  rounds: 3,
  round_win: true,
  main_round_time: 60,
  additional_round_time: 30,
};

describe('NominationsService', () => {
  const createPrismaMock = () => ({
    nominations: {
      findUnique: jest.fn().mockResolvedValue(nomination),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(nomination),
    },
    fights: {
      count: jest.fn().mockResolvedValue(1),
    },
  });

  it('updates round time without existing-fight confirmation', async () => {
    const prisma = createPrismaMock();
    const service = new NominationsService(prisma as unknown as PrismaService);

    await service.update(1, { main_round_time: 90 });

    expect(prisma.fights.count).not.toHaveBeenCalled();
    expect(prisma.nominations.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { main_round_time: 90 },
    });
  });

  it('still requires confirmation when scoring rules change and fights exist', async () => {
    const prisma = createPrismaMock();
    const service = new NominationsService(prisma as unknown as PrismaService);

    await expect(service.update(1, { round_win: false })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.fights.count).toHaveBeenCalledWith({
      where: { nomination_id: 1 },
    });
  });
});
