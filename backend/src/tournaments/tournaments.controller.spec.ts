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
  };

  beforeEach(async () => {
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
});
