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
import { UpdateDisciplinaryCardDto } from './dto/update-disciplinary-card.dto';

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
    marshal_id: 4,
    type: 'YELLOW',
    received_at: '2026-05-15',
    reason: 'Passive conduct',
  };

  it('allows organizers to create cards', () => {
    const { controller, service } = createController();

    void controller.create(createDto, { user: { is_organizer: true } });

    expect(service.create).toHaveBeenCalledWith(createDto);
  });

  it('rejects card creation by regular authenticated users', () => {
    const { controller } = createController();

    expect(() => controller.create(createDto, { user: {} })).toThrow(
      ForbiddenException,
    );
  });

  it('allows card managers to delete cards', () => {
    const { controller, service } = createController();

    void controller.delete(7, { user: { is_secretary: true } });

    expect(service.delete).toHaveBeenCalledWith(7);
    expect(() => controller.delete(7, { user: {} })).toThrow(
      ForbiddenException,
    );
  });

  it('allows card managers to update card marshal', () => {
    const { controller, service } = createController();
    const updateDto: UpdateDisciplinaryCardDto = {
      marshal_id: 8,
    };

    void controller.update(7, updateDto, { user: { is_secretary: true } });

    expect(service.update).toHaveBeenCalledWith(7, updateDto);
  });

  it('rejects card updates by organizers', () => {
    const { controller } = createController();
    const updateDto: UpdateDisciplinaryCardDto = {
      marshal_id: 8,
    };

    expect(() =>
      controller.update(7, updateDto, { user: { is_organizer: true } }),
    ).toThrow(ForbiddenException);
  });
});
