import { CompetitionService } from '../competition/competition.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { AutomaticRedCardService } from './automatic-reds/automatic-red-card.service';
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

  it('rejects automatic card result and metadata edits', async () => {
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

  it('rejects direct expiration edit for a locked yellow', async () => {
    const { redYellowSources, service } = createService();
    redYellowSources.isYellowExpirationLocked.mockResolvedValue(true);

    await expect(
      service.validateUpdate(
        createStoredCard(),
        { expires_at: '2026-07-01' },
        { fight_locked: false, results_fixed: false },
      ),
    ).rejects.toThrow('Yellow card expiration is locked');
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
