import { ForbiddenException } from '@nestjs/common';

jest.mock(
  '@shared/routes',
  () => ({
    API_ROUTES: { DISCIPLINARY_CARDS: { ROOT: 'disciplinary-cards' } },
  }),
  { virtual: true },
);
jest.mock('./disciplinary-cards.service', () => ({
  DisciplinaryCardsService: class DisciplinaryCardsService {},
}));

import { DisciplinaryCardsController } from './disciplinary-cards.controller';
import type { DisciplinaryCardsService } from './disciplinary-cards.service';
import { CreateDisciplinaryCardDto } from './dto/create-disciplinary-card.dto';

describe('DisciplinaryCardsController', () => {
  const createController = () => {
    const service = {
      findByFighter: jest.fn(),
      findByTournament: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    return {
      service,
      controller: new DisciplinaryCardsController(
        service as unknown as DisciplinaryCardsService,
      ),
    };
  };

  const createDto: CreateDisciplinaryCardDto = {
    fighter_id: 1,
    tournament_id: 2,
    fight_id: 3,
    type: 'YELLOW',
    received_at: '2026-05-15',
    reason: 'Passive conduct',
  };

  it('allows organizers to create cards', () => {
    const { controller, service } = createController();

    controller.create(createDto, { user: { is_organizer: true } });

    expect(service.create).toHaveBeenCalledWith(createDto);
  });

  it('rejects card creation by regular authenticated users', () => {
    const { controller } = createController();

    expect(() => controller.create(createDto, { user: {} })).toThrow(
      ForbiddenException,
    );
  });

  it('allows only admins to delete cards', () => {
    const { controller, service } = createController();

    controller.delete(7, { user: { is_admin: true } });

    expect(service.delete).toHaveBeenCalledWith(7);
    expect(() =>
      controller.delete(7, { user: { is_organizer: true } }),
    ).toThrow(ForbiddenException);
  });
});
