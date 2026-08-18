import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock(
  '@shared/routes',
  () => ({
    API_ROUTES: {
      TOURNAMENTS: {
        ROOT: 'tournaments',
        COUNT: 'count',
        NOMINATION: 'nominations',
      },
    },
  }),
  { virtual: true },
);

describe('TournamentsController', () => {
  let controller: TournamentsController;
  const tournamentsService = {
    findOne: jest.fn(),
    getTournamentReport: jest.fn(),
    deleteNomination: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TournamentsController],
      providers: [
        {
          provide: TournamentsService,
          useValue: tournamentsService,
        },
      ],
    }).compile();

    controller = module.get<TournamentsController>(TournamentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('deletes a tournament nomination for an organizer', async () => {
    tournamentsService.deleteNomination.mockResolvedValue({
      id: 42,
      tournament_id: 31,
      nomination_id: 5,
    });
    const req = {
      user: { is_admin: false, is_organizer: true },
    } as Parameters<TournamentsController['deleteNomination']>[2];

    await expect(controller.deleteNomination(31, 5, req)).resolves.toMatchObject(
      {
        id: 42,
        nomination_id: 5,
      },
    );

    expect(tournamentsService.deleteNomination).toHaveBeenCalledWith(31, 5);
  });

  it('rejects tournament nomination deletion without edit access', () => {
    const req = {
      user: { is_admin: false, is_organizer: false },
    } as Parameters<TournamentsController['deleteNomination']>[2];

    expect(() => controller.deleteNomination(31, 5, req)).toThrow(
      ForbiddenException,
    );
    expect(tournamentsService.deleteNomination).not.toHaveBeenCalled();
  });
});
