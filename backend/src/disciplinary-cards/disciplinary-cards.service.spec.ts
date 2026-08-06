import { CompetitionService } from '../competition/competition.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { AutomaticRedCardService } from './automatic-reds/automatic-red-card.service';
import { DisciplinaryCardReader } from './cards/disciplinary-card-reader';
import { DisciplinaryCardStorage } from './cards/disciplinary-card-storage';
import {
  AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT,
  AUTO_RED_TWO_YELLOWS_SAME_TOURNAMENT,
  CARD_RED,
  CARD_YELLOW,
  SOURCE_AUTOMATIC,
  SOURCE_MANUAL,
} from './disciplinary-card.constants';
import type { StoredDisciplinaryCard } from './disciplinary-card.types';
import { DisciplinaryCardConsequencesService } from './consequences/disciplinary-card-consequences.service';
import { DisciplinaryCardExpirationService } from './expiration/disciplinary-card-expiration.service';
import { DisciplinaryCardPolicyService } from './policy/disciplinary-card-policy.service';
import { RedYellowSourceService } from './red-yellow-sources/red-yellow-source.service';
import { ActiveRedCardService } from './active-reds/active-red-card.service';
import { DisciplinaryCardsService } from './disciplinary-cards.service';

type TaggedRawMock = jest.Mock<
  Promise<unknown>,
  [TemplateStringsArray, ...unknown[]]
>;

const createTaggedRawMock = (): TaggedRawMock =>
  jest.fn<Promise<unknown>, [TemplateStringsArray, ...unknown[]]>();

const createStoredCard = (
  overrides: Partial<StoredDisciplinaryCard> = {},
): StoredDisciplinaryCard => ({
  id: 1,
  fighter_id: 10,
  tournament_id: 20,
  fight_id: 30,
  marshal_id: 40,
  type: CARD_YELLOW,
  source: SOURCE_MANUAL,
  received_at: new Date('2026-05-15T00:00:00.000Z'),
  reason: 'Passive conduct',
  expires_at: new Date('2026-06-15T00:00:00.000Z'),
  active: true,
  created_at: new Date('2026-05-15T00:00:00.000Z'),
  updated_at: new Date('2026-05-15T00:00:00.000Z'),
  ...overrides,
});

describe('DisciplinaryCardPolicyService', () => {
  const createService = () => {
    const redYellowSources = {
      isYellowExpirationLocked: jest.fn<Promise<boolean>, [number]>(),
    };
    const service = new DisciplinaryCardPolicyService(
      {} as PrismaService,
      redYellowSources as unknown as RedYellowSourceService,
    );

    return { redYellowSources, service };
  };

  it('rejects automatic card result and metadata edits except inactive cross-red activation', async () => {
    const { service } = createService();
    const card = createStoredCard({ source: SOURCE_AUTOMATIC });
    const lockState = { fight_locked: false, results_fixed: false };

    await expect(
      service.validateUpdate(card, { reason: 'changed' }, lockState),
    ).rejects.toThrow('Automatic card reason cannot be edited');
    await expect(
      service.validateUpdate(card, { type: CARD_RED }, lockState),
    ).rejects.toThrow('Automatic card type cannot be edited');
    await expect(
      service.validateUpdate(card, { marshal_id: 5 }, lockState),
    ).rejects.toThrow('Automatic card marshal cannot be edited');
    await expect(
      service.validateUpdate(card, { active: false }, lockState),
    ).rejects.toThrow('Automatic card active flag cannot be edited');

    await expect(
      service.validateUpdate(
        createStoredCard({
          type: CARD_RED,
          source: SOURCE_AUTOMATIC,
          active: false,
          reason: AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT,
        }),
        { active: true },
        { fight_locked: true, results_fixed: true },
      ),
    ).resolves.toBeUndefined();
  });

  it('rejects active red deactivation', async () => {
    const { service } = createService();
    const card = createStoredCard({ type: CARD_RED, active: true });

    await expect(
      service.validateUpdate(
        card,
        { active: false },
        { fight_locked: false, results_fixed: false },
      ),
    ).rejects.toThrow('Active red card cannot be deactivated');
  });

  it('rejects any update for a yellow closed by an automatic red', async () => {
    const { redYellowSources, service } = createService();
    redYellowSources.isYellowExpirationLocked.mockResolvedValue(true);

    await expect(
      service.validateUpdate(
        createStoredCard(),
        { reason: 'changed' },
        { fight_locked: false, results_fixed: false },
      ),
    ).rejects.toThrow('Yellow card is locked by automatic red');
  });

  it('rejects card deletion after later Olympic fights are formed', async () => {
    const service = new DisciplinaryCardPolicyService(
      {
        fights: {
          findUnique: jest.fn().mockResolvedValue({
            id: 30,
            bracket_round: 2,
            is_bronze: false,
            block: {
              type: 'OLYMPIC',
              lifecycle_state: 'FIGHTS_EDITABLE',
              status: 'ACTIVE',
              tournament_nomination: { is_finished: false },
              round_states: [
                { round: 2, results_fixed: false },
                { round: 3, results_fixed: false },
              ],
            },
          }),
        },
      } as unknown as PrismaService,
      {
        isYellowExpirationLocked: jest.fn<Promise<boolean>, [number]>(),
      } as unknown as RedYellowSourceService,
    );

    await expect(
      service.ensureCardCanBeDeleted(createStoredCard({ fight_id: 30 })),
    ).rejects.toThrow(
      'Cannot delete a card after later Olympic fights are formed',
    );
  });

  it('rejects card deletion after source fight results are fixed', async () => {
    const service = new DisciplinaryCardPolicyService(
      {
        fights: {
          findUnique: jest.fn().mockResolvedValue({
            id: 30,
            bracket_round: 2,
            is_bronze: false,
            block: {
              type: 'OLYMPIC',
              lifecycle_state: 'FIGHTS_EDITABLE',
              status: 'ACTIVE',
              tournament_nomination: { is_finished: false },
              round_states: [{ round: 2, results_fixed: true }],
            },
          }),
        },
      } as unknown as PrismaService,
      {
        isYellowExpirationLocked: jest.fn<Promise<boolean>, [number]>(),
      } as unknown as RedYellowSourceService,
    );

    await expect(
      service.ensureCardCanBeDeleted(createStoredCard({ fight_id: 30 })),
    ).rejects.toThrow('Cannot delete a card after fight results are fixed');
  });

  it('allows card deletion after downstream Olympic rollback when source results are editable', async () => {
    const service = new DisciplinaryCardPolicyService(
      {
        fights: {
          findUnique: jest.fn().mockResolvedValue({
            id: 30,
            bracket_round: 2,
            is_bronze: false,
            block: {
              type: 'OLYMPIC',
              lifecycle_state: 'FIGHTS_EDITABLE',
              status: 'ACTIVE',
              tournament_nomination: { is_finished: false },
              round_states: [{ round: 2, results_fixed: false }],
            },
          }),
        },
      } as unknown as PrismaService,
      {
        isYellowExpirationLocked: jest.fn<Promise<boolean>, [number]>(),
      } as unknown as RedYellowSourceService,
    );

    await expect(
      service.ensureCardCanBeDeleted(createStoredCard({ fight_id: 30 })),
    ).resolves.toBeUndefined();
  });
});

describe('ActiveRedCardService', () => {
  it('uses tournament check date for active red lookup', async () => {
    const queryRaw = createTaggedRawMock().mockResolvedValue([
      { fighter_id: 10 },
      { fighter_id: 11 },
    ]);
    const storage = {
      ensureStorageReady: jest.fn<Promise<void>, []>().mockResolvedValue(),
    };
    const expiration = {
      getTournamentCheckDate: jest
        .fn<Promise<Date>, [number]>()
        .mockResolvedValue(new Date('2026-05-20T00:00:00.000Z')),
    };
    const service = new ActiveRedCardService(
      { $queryRaw: queryRaw } as unknown as PrismaService,
      storage as unknown as DisciplinaryCardStorage,
      expiration as unknown as DisciplinaryCardExpirationService,
    );

    await expect(service.hasActiveRedForTournament(10, 20)).resolves.toBe(true);

    expect(storage.ensureStorageReady).toHaveBeenCalledTimes(1);
    expect(expiration.getTournamentCheckDate).toHaveBeenCalledWith(20);
  });
});

describe('DisciplinaryCardReader', () => {
  it('computes response active from structural active and context date', async () => {
    let capturedSql = '';
    let capturedValues: unknown[] = [];
    const queryRaw: TaggedRawMock = jest.fn((strings, ...values) => {
      capturedSql = Array.from(strings).join(' ');
      capturedValues = values;

      return Promise.resolve([]);
    });
    const reader = new DisciplinaryCardReader({
      $queryRaw: queryRaw,
    } as unknown as PrismaService);
    const checkDate = new Date('2026-08-06T00:00:00.000Z');

    await reader.findCards({ fighterId: 10 }, checkDate);

    expect(capturedSql).toContain('dc."active" = true');
    expect(capturedSql).toContain('dc."received_at" <=');
    expect(capturedSql).toContain('dc."expires_at" >=');
    expect(capturedSql).toContain('historical_source."closed_at" >');
    expect(capturedSql).toContain(
      'historical_source."yellow_active_before_close" = true',
    );
    expect(capturedSql).toContain(
      'historical_source."yellow_expires_at_before_close" >=',
    );
    expect(capturedSql).toContain('AS "active"');
    expect(capturedSql).toContain('later_state."round" > f."bracket_round"');
    expect(capturedSql).toContain('> dc."received_at"');
    expect(capturedValues).toContain(checkDate);
  });

  it('includes historically active source yellows in tournament active summaries', async () => {
    let capturedSql = '';
    let capturedValues: unknown[] = [];
    const queryRaw: TaggedRawMock = jest.fn((strings, ...values) => {
      capturedSql = Array.from(strings).join(' ');
      capturedValues = values;

      return Promise.resolve([]);
    });
    const reader = new DisciplinaryCardReader({
      $queryRaw: queryRaw,
    } as unknown as PrismaService);
    const checkDate = new Date('2026-05-20T00:00:00.000Z');

    await reader.findActiveCardsForTournament(20, checkDate);

    expect(capturedSql).toContain('historical_source."closed_at" >');
    expect(capturedSql).toContain(
      'historical_source."yellow_active_before_close" = true',
    );
    expect(capturedSql).toContain(
      'historical_source."yellow_expires_at_before_close" >=',
    );
    expect(capturedSql).toContain('dc."received_at" <=');
    expect(capturedValues).toContain(checkDate);
  });
});

describe('AutomaticRedCardService', () => {
  const createService = (queryRaw: TaggedRawMock) => {
    const settings = {
      getDisciplinaryCardSettings: jest.fn().mockResolvedValue({
        red_auto_yellow_days: 30,
      }),
    };
    const storage = {
      insertCard: jest.fn<
        Promise<StoredDisciplinaryCard>,
        [Parameters<DisciplinaryCardStorage['insertCard']>[0]]
      >(),
    };
    const expiration = {
      addDays: jest
        .fn<Date, [Date, number]>()
        .mockReturnValue(new Date('2026-06-14T00:00:00.000Z')),
    };
    const redYellowSources = {
      recordRedYellowSources: jest.fn<Promise<void>, [number, number[]]>(),
      closeSourceYellowsForRed: jest.fn<Promise<void>, [number, Date]>(),
      deleteInactiveCrossTournamentRedsForTournamentSourceYellows: jest.fn<
        Promise<void>,
        [number, number[]]
      >(),
    };
    const consequences = {
      applyRedCardConsequences: jest.fn<
        Promise<void>,
        [StoredDisciplinaryCard]
      >(),
    };
    const service = new AutomaticRedCardService(
      { $queryRaw: queryRaw } as unknown as PrismaService,
      settings as unknown as SettingsService,
      storage as unknown as DisciplinaryCardStorage,
      expiration as unknown as DisciplinaryCardExpirationService,
      redYellowSources as unknown as RedYellowSourceService,
      consequences as unknown as DisciplinaryCardConsequencesService,
    );

    return { consequences, redYellowSources, service, storage };
  };

  it('creates active automatic red from two same-tournament yellows', async () => {
    const redCard = createStoredCard({
      id: 99,
      type: CARD_RED,
      source: SOURCE_AUTOMATIC,
      active: true,
      reason: AUTO_RED_TWO_YELLOWS_SAME_TOURNAMENT,
    });
    const queryRaw = createTaggedRawMock()
      .mockResolvedValueOnce([
        { id: 1, tournament_id: 20 },
        { id: 2, tournament_id: 20 },
      ])
      .mockResolvedValueOnce([]);
    const { consequences, redYellowSources, service, storage } =
      createService(queryRaw);
    storage.insertCard.mockResolvedValue(redCard);

    await service.createAutomaticRedIfNeeded(createStoredCard());

    expect(storage.insertCard).toHaveBeenCalledWith(
      expect.objectContaining({
        active: true,
        reason: AUTO_RED_TWO_YELLOWS_SAME_TOURNAMENT,
        source: SOURCE_AUTOMATIC,
        type: CARD_RED,
      }),
    );
    expect(redYellowSources.recordRedYellowSources).toHaveBeenCalledWith(
      99,
      [1, 2],
    );
    expect(
      redYellowSources.deleteInactiveCrossTournamentRedsForTournamentSourceYellows,
    ).toHaveBeenCalledWith(20, [1, 2]);
    expect(redYellowSources.closeSourceYellowsForRed).toHaveBeenCalledWith(
      99,
      redCard.received_at,
    );
    expect(consequences.applyRedCardConsequences).toHaveBeenCalledWith(redCard);
  });

  it('creates inactive automatic red from three cross-tournament yellows', async () => {
    const redCard = createStoredCard({
      id: 100,
      type: CARD_RED,
      source: SOURCE_AUTOMATIC,
      active: false,
      reason: AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT,
    });
    const queryRaw = createTaggedRawMock()
      .mockResolvedValueOnce([
        { id: 1, tournament_id: 20 },
        { id: 2, tournament_id: 21 },
        { id: 3, tournament_id: 22 },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const { redYellowSources, service, storage } = createService(queryRaw);
    storage.insertCard.mockResolvedValue(redCard);

    await service.createAutomaticRedIfNeeded(createStoredCard());

    expect(storage.insertCard).toHaveBeenCalledWith(
      expect.objectContaining({
        active: false,
        reason: AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT,
      }),
    );
    expect(redYellowSources.recordRedYellowSources).toHaveBeenCalledWith(
      100,
      [1, 2, 3],
    );
    expect(redYellowSources.closeSourceYellowsForRed).not.toHaveBeenCalled();
  });

  it('recreates inactive cross-tournament red from the current third active yellow', async () => {
    const triggerDate = new Date('2026-05-19T00:00:00.000Z');
    const redCard = createStoredCard({
      id: 101,
      type: CARD_RED,
      source: SOURCE_AUTOMATIC,
      active: false,
      reason: AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT,
      received_at: triggerDate,
    });
    const queryRaw = createTaggedRawMock()
      .mockResolvedValueOnce([
        {
          id: 1,
          tournament_id: 10,
          fight_id: 100,
          marshal_id: 200,
          received_at: new Date('2026-05-01T00:00:00.000Z'),
        },
        {
          id: 2,
          tournament_id: 11,
          fight_id: 101,
          marshal_id: 201,
          received_at: new Date('2026-05-10T00:00:00.000Z'),
        },
        {
          id: 3,
          tournament_id: 20,
          fight_id: 102,
          marshal_id: 202,
          received_at: triggerDate,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const { redYellowSources, service, storage } = createService(queryRaw);
    storage.insertCard.mockResolvedValue(redCard);

    await service.createInactiveCrossTournamentRedIfNeeded(
      10,
      20,
      new Date('2026-05-20T00:00:00.000Z'),
    );

    expect(storage.insertCard).toHaveBeenCalledWith(
      expect.objectContaining({
        fighterId: 10,
        tournamentId: 20,
        fightId: 102,
        marshalId: 202,
        receivedAt: triggerDate,
        active: false,
        reason: AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT,
      }),
    );
    expect(redYellowSources.recordRedYellowSources).toHaveBeenCalledWith(
      101,
      [1, 2, 3],
    );
  });
});

describe('DisciplinaryCardsService', () => {
  const createService = (
    existing: StoredDisciplinaryCard,
    updated: StoredDisciplinaryCard = existing,
  ) => {
    const competition = {
      assertFightLifecycleEditable: jest.fn<Promise<void>, [number]>(),
      resetForfeitsForCard: jest.fn<Promise<void>, [number]>(),
      resetEditableForfeitsForCard: jest.fn<Promise<void>, [number]>(),
      applyRedCardForfeits: jest.fn<Promise<void>, [number]>(),
      applyRedCardConsequences: jest.fn<Promise<void>, [number]>(),
    };
    const automaticReds = {
      createAutomaticRedIfNeeded: jest.fn<
        Promise<void>,
        [StoredDisciplinaryCard]
      >(),
      createInactiveCrossTournamentRedIfNeeded: jest.fn<
        Promise<void>,
        [number, number, Date]
      >(),
    };
    const storage = {
      ensureStorageReady: jest.fn<Promise<void>, []>(),
      getStoredCard: jest
        .fn<Promise<StoredDisciplinaryCard>, [number]>()
        .mockResolvedValueOnce(existing)
        .mockResolvedValue(updated),
      updateCard: jest.fn<
        Promise<void>,
        [Parameters<DisciplinaryCardStorage['updateCard']>[0]]
      >(),
      deleteCard: jest.fn<Promise<void>, [number]>(),
    };
    const policy = {
      validateUpdate: jest.fn<
        Promise<void>,
        Parameters<DisciplinaryCardPolicyService['validateUpdate']>
      >(),
      getCardFightLockState: jest.fn().mockResolvedValue({
        fight_locked: false,
        results_fixed: false,
      }),
      ensureCardCanBeDeleted: jest.fn<Promise<void>, [StoredDisciplinaryCard]>(),
    };
    const reader = {
      findActiveCardsForTournament: jest
        .fn<Promise<unknown[]>, [number, Date]>()
        .mockResolvedValue([]),
      findCards: jest
        .fn<
          Promise<unknown[]>,
          [{ fighterId?: number; tournamentId?: number }, Date]
        >()
        .mockResolvedValue([]),
      findOne: jest
        .fn<Promise<StoredDisciplinaryCard>, [number, Date]>()
        .mockResolvedValue(updated),
    };
    const redYellowSources = {
      updateAutomaticRedMarshalFromTriggerYellow: jest.fn<
        Promise<void>,
        [StoredDisciplinaryCard]
      >(),
      restoreSourceYellowsForRed: jest.fn<Promise<void>, [number]>(),
      deleteRedYellowSources: jest.fn<Promise<void>, [number]>(),
      closeSourceYellowsForRed: jest.fn<Promise<void>, [number, Date]>(),
      deleteAutomaticRedsIssuedFromYellow: jest.fn<Promise<void>, [number]>(),
    };
    const expiration = {
      calculateExpiration: jest.fn<
        Promise<Date>,
        Parameters<DisciplinaryCardExpirationService['calculateExpiration']>
      >(),
      getTournamentCheckDate: jest
        .fn<Promise<Date>, [number]>()
        .mockResolvedValue(new Date('2026-05-20T00:00:00.000Z')),
      toDateOnly: jest
        .fn<Date, [string | Date]>()
        .mockImplementation((value) =>
          new DisciplinaryCardExpirationService(
            {} as PrismaService,
            {} as SettingsService,
          ).toDateOnly(value),
        ),
    };
    const service = new DisciplinaryCardsService(
      competition as unknown as CompetitionService,
      {} as ActiveRedCardService,
      automaticReds as unknown as AutomaticRedCardService,
      {} as DisciplinaryCardConsequencesService,
      expiration,
      policy as unknown as DisciplinaryCardPolicyService,
      reader as unknown as DisciplinaryCardReader,
      redYellowSources as unknown as RedYellowSourceService,
      storage as unknown as DisciplinaryCardStorage,
    );

    return {
      automaticReds,
      competition,
      expiration,
      reader,
      redYellowSources,
      service,
      storage,
    };
  };

  it('uses current server date-only for fighter card list', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-06T19:30:00.000Z'));
    try {
      const { reader, service, storage } = createService(createStoredCard());

      await service.findByFighter(10);

      expect(storage.ensureStorageReady).toHaveBeenCalledTimes(1);
      expect(reader.findCards).toHaveBeenCalledWith(
        { fighterId: 10 },
        new Date('2026-08-06T00:00:00.000Z'),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('uses tournament event date for tournament card list', async () => {
    const { expiration, reader, service, storage } =
      createService(createStoredCard());
    const checkDate = new Date('2026-05-20T00:00:00.000Z');

    await service.findByTournament(20);

    expect(storage.ensureStorageReady).toHaveBeenCalledTimes(1);
    expect(expiration.getTournamentCheckDate).toHaveBeenCalledWith(20);
    expect(reader.findCards).toHaveBeenCalledWith(
      { tournamentId: 20 },
      checkDate,
    );
  });

  it('uses tournament event date for tournament active-card summaries', async () => {
    const { expiration, reader, service, storage } =
      createService(createStoredCard());
    const checkDate = new Date('2026-05-20T00:00:00.000Z');

    await service.findActiveForTournament(20);

    expect(storage.ensureStorageReady).toHaveBeenCalledTimes(1);
    expect(expiration.getTournamentCheckDate).toHaveBeenCalledWith(20);
    expect(reader.findActiveCardsForTournament).toHaveBeenCalledWith(
      20,
      checkDate,
    );
  });

  it('rechecks inactive cross-tournament red after manual yellow deletion', async () => {
    const existing = createStoredCard({
      id: 7,
      type: CARD_YELLOW,
      fighter_id: 10,
      tournament_id: 20,
    });
    const { automaticReds, redYellowSources, service, storage } =
      createService(existing);

    await service.delete(existing.id);

    expect(redYellowSources.deleteAutomaticRedsIssuedFromYellow).toHaveBeenCalledWith(
      existing.id,
    );
    expect(storage.deleteCard).toHaveBeenCalledWith(existing.id);
    expect(
      automaticReds.createInactiveCrossTournamentRedIfNeeded,
    ).toHaveBeenCalledWith(
      existing.fighter_id,
      existing.tournament_id,
      existing.received_at,
    );
  });

  it('keeps ordinary card structurally active when saved expiration is earlier than today', async () => {
    const existing = createStoredCard({
      expires_at: new Date('2099-01-01T00:00:00.000Z'),
      active: true,
    });
    const { service, storage } = createService(existing);

    await service.update(existing.id, { expires_at: '2000-01-01' });

    expect(storage.updateCard).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existing.id,
        active: true,
        expiresAt: new Date('2000-01-01T00:00:00.000Z'),
      }),
    );
  });

  it('keeps ordinary card structurally active when saved expiration is today or later', async () => {
    const existing = createStoredCard({
      expires_at: new Date('2000-01-01T00:00:00.000Z'),
      active: false,
    });
    const { service, storage } = createService(existing);

    await service.update(existing.id, { expires_at: '2099-01-01' });

    expect(storage.updateCard).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existing.id,
        active: true,
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      }),
    );
  });

  it('does not activate inactive automatic cross-tournament red by expiration edit', async () => {
    const existing = createStoredCard({
      type: CARD_RED,
      source: SOURCE_AUTOMATIC,
      reason: AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT,
      expires_at: new Date('2000-01-01T00:00:00.000Z'),
      active: false,
    });
    const { service, storage } = createService(existing);

    await service.update(existing.id, { expires_at: '2099-01-01' });

    expect(storage.updateCard).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existing.id,
        active: false,
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      }),
    );
  });

  it('rejects inactive automatic cross-tournament red activation on its original issue date', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-15T19:30:00.000Z'));
    const existing = createStoredCard({
      type: CARD_RED,
      source: SOURCE_AUTOMATIC,
      reason: AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT,
      received_at: new Date('2026-05-15T00:00:00.000Z'),
      active: false,
    });
    const { service, storage } = createService(existing);

    try {
      await expect(service.update(existing.id, { active: true })).rejects.toThrow(
        'Inactive red card cannot be activated on or before its original issue date',
      );
    } finally {
      jest.useRealTimers();
    }
    expect(storage.updateCard).not.toHaveBeenCalled();
  });

  it('activates inactive automatic cross-tournament red with activation date as issue date', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-06T19:30:00.000Z'));
    const receivedAt = new Date('2026-05-15T00:00:00.000Z');
    const activationDate = new Date('2026-08-06T00:00:00.000Z');
    const existing = createStoredCard({
      type: CARD_RED,
      source: SOURCE_AUTOMATIC,
      reason: AUTO_RED_THREE_YELLOWS_CROSS_TOURNAMENT,
      received_at: receivedAt,
      active: false,
    });
    const updated = createStoredCard({
      ...existing,
      active: true,
      received_at: activationDate,
    });
    const { redYellowSources, service, storage } = createService(
      existing,
      updated,
    );

    try {
      await service.update(existing.id, { active: true });
    } finally {
      jest.useRealTimers();
    }

    expect(storage.updateCard).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existing.id,
        active: true,
        receivedAt: activationDate,
      }),
    );
    expect(redYellowSources.closeSourceYellowsForRed).toHaveBeenCalledWith(
      updated.id,
      activationDate,
    );
  });
});

describe('RedYellowSourceService', () => {
  it('deletes linked automatic red and reapplies tournament forfeits', async () => {
    const queryRaw = createTaggedRawMock().mockResolvedValue([
      createStoredCard({
        id: 50,
        type: CARD_RED,
        source: SOURCE_AUTOMATIC,
        active: true,
      }),
    ]);
    const executeRaw = createTaggedRawMock().mockResolvedValue(undefined);
    const competition = {
      resetForfeitsForCard: jest.fn<Promise<void>, [number]>(),
      applyRedCardForfeits: jest.fn<Promise<void>, [number]>(),
    };
    const storage = {
      deleteCard: jest.fn<Promise<void>, [number]>(),
    };
    const service = new RedYellowSourceService(
      {
        $executeRaw: executeRaw,
        $queryRaw: queryRaw,
      } as unknown as PrismaService,
      competition as unknown as CompetitionService,
      storage as unknown as DisciplinaryCardStorage,
    );

    await service.deleteAutomaticRedsIssuedFromYellow(7);

    expect(competition.resetForfeitsForCard).toHaveBeenCalledWith(50);
    expect(storage.deleteCard).toHaveBeenCalledWith(50);
    expect(competition.applyRedCardForfeits).toHaveBeenCalledWith(20);
  });
});
