import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('./tournament-report.pdf', () => {
  const actual = jest.requireActual<typeof import('./tournament-report.pdf')>(
    './tournament-report.pdf',
  );

  return {
    ...actual,
    createTournamentReportPdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
  };
});

import { TournamentsService } from './tournaments.service';
import { PrismaService } from '../prisma/prisma.service';
import { createTournamentReportPdf } from './tournament-report.pdf';

describe('TournamentsService', () => {
  const createService = () => {
    const prisma = {
      $executeRawUnsafe: jest.fn(),
      $queryRawUnsafe: jest.fn(),
      competitors: {
        findMany: jest.fn(),
      },
      competition_blocks: {
        findMany: jest.fn(),
      },
      fights: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('includes marshals and disciplinary cards in generated tournament reports', async () => {
    const { prisma, service } = createService();
    const createTournamentReportPdfMock = jest.mocked(
      createTournamentReportPdf,
    );

    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ table_name: 'tournament_reports' }])
      .mockResolvedValueOnce([]);
    prisma.competition_blocks.findMany.mockResolvedValue([]);
    prisma.tournaments.findUnique.mockResolvedValue({
      id: 31,
      name: 'Open Cup',
      event_date: new Date('2026-05-10T00:00:00.000Z'),
      country: { name: 'Georgia' },
      city: { name: 'Tbilisi' },
      competitors: [{ nomination_id: 5 }],
      marshals: [
        {
          marshal: {
            name: 'Nino',
            surname: 'Judge',
            patronymic: null,
            category: { name_en: 'National', name_ru: 'Национальная' },
            country: { name: 'Georgia' },
            city: { name: 'Tbilisi' },
          },
        },
      ],
      disciplinary_cards: [
        {
          id: 4,
          fighter_id: 11,
          type: 'RED',
          reason: 'Dangerous action',
          fighter: {
            id: 11,
            name: 'Alex',
            surname: 'Red',
            patronymic: null,
          },
          fight: {
            fight_number: 3,
            nomination: { name_en: 'Adults', name_ru: 'Взрослые' },
          },
        },
      ],
      nominations: [
        {
          nomination_id: 5,
          is_finished: true,
          nomination: { name_en: 'Adults', name_ru: 'Взрослые' },
          placements: [],
          blocks: [
            {
              type: 'GROUP',
              stage: 1,
              groups: [
                {
                  id: 8,
                  name: 'A',
                  fighters: [],
                  placements: [],
                },
              ],
              fights: [
                {
                  fight_number: 7,
                  group_id: 8,
                  competitor1_id: 101,
                  competitor2_id: 102,
                  competitor1_score: 5,
                  competitor2_score: 3,
                  bracket_round: null,
                  bracket_position: null,
                  is_bronze: false,
                  is_finished: true,
                  competitor1: {
                    fighter: {
                      name: 'Alex',
                      surname: 'Red',
                      patronymic: null,
                    },
                  },
                  competitor2: {
                    fighter: {
                      name: 'Beka',
                      surname: 'Blue',
                      patronymic: null,
                    },
                  },
                  winner: {
                    fighter: {
                      name: 'Alex',
                      surname: 'Red',
                      patronymic: null,
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    });
    prisma.competitors.findMany.mockResolvedValue([{ fighter_id: 11 }]);
    prisma.$executeRawUnsafe.mockResolvedValue(undefined);

    await service.getTournamentReport(31, 'en');

    const markdown = createTournamentReportPdfMock.mock.calls[0]?.[0] ?? '';
    expect(markdown).toContain('## Marshals');
    expect(markdown).toContain('Judge Nino');
    expect(markdown).toContain('National');
    expect(markdown).toContain('## Disciplinary cards');
    expect(markdown).toContain('Red');
    expect(markdown).toContain('Dangerous action');
    expect(markdown).toContain('#3');
    expect(markdown).not.toContain('Source');
    expect(markdown).not.toContain('Issued');
    expect(markdown).not.toContain('Expires');
    expect(markdown).not.toContain('Opponent');
    expect(markdown).toContain('Fight #');
    expect(markdown).toContain('|&nbsp;&nbsp;7|');
  });

  it('returns saved reports without regenerating stored PDF data', async () => {
    const { prisma, service } = createService();
    const createTournamentReportPdfMock = jest.mocked(
      createTournamentReportPdf,
    );
    const savedPdf = Buffer.from('saved-pdf');

    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ table_name: 'tournament_reports' }])
      .mockResolvedValueOnce([
        {
          file_name: 'saved-report.pdf',
          pdf_data_base64: savedPdf.toString('base64'),
        },
      ]);

    await expect(service.getTournamentReport(31, 'en')).resolves.toEqual({
      fileName: 'saved-report.pdf',
      pdf: savedPdf,
    });

    expect(prisma.tournaments.findUnique).not.toHaveBeenCalled();
    expect(createTournamentReportPdfMock).not.toHaveBeenCalled();
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });
});
