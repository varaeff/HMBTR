import type { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  apiPath,
  bearer,
  createIntegrationApp,
  resetDatabase,
  responseBody,
} from './integration-utils';

jest.mock('../src/tournaments/tournament-report.pdf', () => {
  const actual = jest.requireActual<
    typeof import('../src/tournaments/tournament-report.pdf')
  >('../src/tournaments/tournament-report.pdf');

  return {
    ...actual,
    createReportFileName: (tournamentName: string, language: string) =>
      `${tournamentName}-results-${language}.pdf`,
    createTournamentReportPdf: jest
      .fn<Promise<Buffer>, [string, string]>()
      .mockResolvedValue(Buffer.from('integration pdf')),
  };
});

interface AuthResponseBody {
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    username: string;
    is_admin: boolean;
    is_organizer: boolean;
    is_secretary: boolean;
  };
}

interface ErrorResponseBody {
  error: string;
  details?: string | string[];
}

interface TournamentFixture {
  countryId: number;
  cityId: number;
  nominationId: number;
  tournamentId: number;
  tournamentNominationId: number;
  fighterIds: number[];
  competitorIds: number[];
  marshalId: number;
}

interface GeneratedFight {
  id: number;
  competitor1_id: number;
  competitor2_id: number;
  forfeit_card_id: number | null;
  is_finished: boolean;
}

const TEST_PASSWORD = 'Password123!';

describe('backend integration flow', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: App;

  beforeAll(async () => {
    const integrationApp = await createIntegrationApp();
    app = integrationApp.app;
    prisma = integrationApp.prisma;
    server = integrationApp.server;
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // Verifies that failed login attempts stay repeatable and do not poison later auth requests.
  it('rejects login for a missing user without mutating auth state', async () => {
    const firstResponse = await request(server)
      .post(apiPath('/auth/login'))
      .send({
        username: 'missing-user',
        password: TEST_PASSWORD,
      });

    expect(firstResponse.status).toBe(401);
    expect(responseBody<ErrorResponseBody>(firstResponse).details).toBe(
      'Invalid credentials',
    );

    const secondResponse = await request(server)
      .post(apiPath('/auth/login'))
      .send({
        username: 'missing-user',
        password: TEST_PASSWORD,
      });

    expect(secondResponse.status).toBe(401);
    expect(responseBody<ErrorResponseBody>(secondResponse).details).toBe(
      'Invalid credentials',
    );
  });

  // Covers the happy-path login flow and proves that the issued JWT works with the global guard.
  it('logs in a seeded user and exposes profile through the global auth guard', async () => {
    await seedUser(prisma, {
      username: 'admin',
      is_admin: true,
    });

    const loginResponse = await request(server)
      .post(apiPath('/auth/login'))
      .send({
        username: 'admin',
        password: TEST_PASSWORD,
      });

    expect(loginResponse.status).toBe(201);
    const auth = responseBody<AuthResponseBody>(loginResponse);
    expect(typeof auth.access_token).toBe('string');
    expect(typeof auth.refresh_token).toBe('string');
    expect(auth.user).toMatchObject({
      username: 'admin',
      is_admin: true,
    });

    const profileResponse = await request(server)
      .post(apiPath('/auth/profile'))
      .set('Authorization', bearer(auth.access_token))
      .send();

    expect(profileResponse.status).toBe(201);
    expect(
      responseBody<AuthResponseBody['user']>(profileResponse),
    ).toMatchObject({
      username: 'admin',
      is_admin: true,
    });
  });

  // Exercises the group competition flow through HTTP: block creation, fight generation, and result fixation.
  it('creates group fights and fixes all group results through competition routes', async () => {
    const token = await seedAndLoginAdmin(prisma, server);
    const fixture = await seedTournamentFixture(prisma, {
      fighterCount: 4,
      registrationOpen: false,
    });

    await request(server)
      .post(apiPath('/competition/groups'))
      .set('Authorization', bearer(token))
      .send({
        tournament_id: fixture.tournamentId,
        nomination_id: fixture.nominationId,
      })
      .expect(201);

    const block = await prisma.competition_blocks.findFirstOrThrow({
      where: {
        tournament_id: fixture.tournamentId,
        nomination_id: fixture.nominationId,
        type: 'GROUP',
      },
      select: { id: true },
    });

    await request(server)
      .post(apiPath('/competition/groups/fights'))
      .set('Authorization', bearer(token))
      .send({
        block_id: block.id,
        groups: [
          {
            letter: 'A',
            competitor_ids: fixture.competitorIds,
          },
        ],
      })
      .expect(201);

    const fights = await prisma.fights.findMany({
      where: { block_id: block.id },
      select: {
        id: true,
        competitor1_id: true,
        competitor2_id: true,
        forfeit_card_id: true,
        is_finished: true,
      },
      orderBy: { fight_number: 'asc' },
    });
    expect(fights).toHaveLength(6);

    const fixationResponse = await request(server)
      .post(apiPath('/competition/lifecycle/results/fix'))
      .set('Authorization', bearer(token))
      .send({
        block_id: block.id,
        fights: buildDominantResultSubmissions(fights, fixture.competitorIds),
      });

    if (fixationResponse.status !== 201) {
      throw new Error(
        JSON.stringify(responseBody<ErrorResponseBody>(fixationResponse)),
      );
    }

    await expect(
      prisma.competition_blocks.findUniqueOrThrow({
        where: { id: block.id },
        select: { lifecycle_state: true },
      }),
    ).resolves.toMatchObject({ lifecycle_state: 'RESULTS_FIXED' });

    const finishedFights = await prisma.fights.count({
      where: {
        block_id: block.id,
        is_finished: true,
        winner_id: { not: null },
      },
    });

    expect(finishedFights).toBe(6);
  });

  // Ensures a manual red card triggers competition-side forfeits for editable fights.
  it('creates a red card and applies editable fight forfeits through card routes', async () => {
    const token = await seedAndLoginAdmin(prisma, server);
    const fixture = await seedTournamentFixture(prisma, {
      fighterCount: 4,
      registrationOpen: false,
    });
    const blockId = await createGroupBlockWithFights(token, fixture);
    const fight = await prisma.fights.findFirstOrThrow({
      where: { block_id: blockId },
      select: {
        id: true,
        competitor1: { select: { fighter_id: true } },
      },
      orderBy: { fight_number: 'asc' },
    });

    const response = await request(server)
      .post(apiPath('/disciplinary-cards'))
      .set('Authorization', bearer(token))
      .send({
        fighter_id: fight.competitor1.fighter_id,
        tournament_id: fixture.tournamentId,
        fight_id: fight.id,
        marshal_id: fixture.marshalId,
        type: 'RED',
        received_at: '2026-07-28',
        reason: 'Dangerous action',
      });

    expect(response.status).toBe(201);

    const card = await prisma.disciplinary_cards.findFirstOrThrow({
      where: {
        fighter_id: fight.competitor1.fighter_id,
        type: 'RED',
        source: 'MANUAL',
      },
      select: { id: true },
    });
    const forfeitedFights = await prisma.fights.findMany({
      where: { forfeit_card_id: card.id },
      select: {
        id: true,
        winner_id: true,
        is_finished: true,
      },
    });

    expect(forfeitedFights.length).toBeGreaterThan(0);
    expect(forfeitedFights.every((item) => item.is_finished)).toBe(true);
  });

  // Checks the Russian PDF report route and verifies that the generated report is cached in the database.
  it('generates and caches a Russian tournament report PDF', async () => {
    const token = await seedAndLoginAdmin(prisma, server);
    const fixture = await seedTournamentFixture(prisma, {
      fighterCount: 2,
      nominationFinished: true,
      registrationOpen: false,
    });

    const response = await request(server)
      .get(apiPath(`/tournaments/${fixture.tournamentId}/report?lang=ru`))
      .set('Authorization', bearer(token));

    if (response.status !== 200) {
      throw new Error(
        JSON.stringify(responseBody<ErrorResponseBody>(response)),
      );
    }
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(Buffer.isBuffer(response.body)).toBe(true);

    await expect(
      prisma.tournament_reports.findUnique({
        where: {
          tournament_id_language: {
            tournament_id: fixture.tournamentId,
            language: 'ru',
          },
        },
      }),
    ).resolves.toMatchObject({
      file_name: 'Integration Cup-results-ru.pdf',
    });
  });

  async function createGroupBlockWithFights(
    token: string,
    fixture: TournamentFixture,
  ) {
    await request(server)
      .post(apiPath('/competition/groups'))
      .set('Authorization', bearer(token))
      .send({
        tournament_id: fixture.tournamentId,
        nomination_id: fixture.nominationId,
      })
      .expect(201);

    const block = await prisma.competition_blocks.findFirstOrThrow({
      where: {
        tournament_id: fixture.tournamentId,
        nomination_id: fixture.nominationId,
        type: 'GROUP',
      },
      select: { id: true },
    });

    await request(server)
      .post(apiPath('/competition/groups/fights'))
      .set('Authorization', bearer(token))
      .send({
        block_id: block.id,
        groups: [
          {
            letter: 'A',
            competitor_ids: fixture.competitorIds,
          },
        ],
      })
      .expect(201);

    return block.id;
  }
});

async function seedAndLoginAdmin(prisma: PrismaService, server: App) {
  await seedUser(prisma, {
    username: 'admin',
    is_admin: true,
    is_organizer: true,
    is_secretary: true,
  });

  const response = await request(server).post(apiPath('/auth/login')).send({
    username: 'admin',
    password: TEST_PASSWORD,
  });

  return responseBody<AuthResponseBody>(response).access_token;
}

async function seedUser(
  prisma: PrismaService,
  overrides: Partial<{
    username: string;
    email: string;
    is_admin: boolean;
    is_organizer: boolean;
    is_secretary: boolean;
  }> = {},
) {
  return prisma.users.create({
    data: {
      username: overrides.username ?? 'user',
      password: await bcrypt.hash(TEST_PASSWORD, 6),
      name: 'Integration',
      surname: 'User',
      email: overrides.email ?? `${overrides.username ?? 'user'}@example.com`,
      is_admin: overrides.is_admin ?? false,
      is_organizer: overrides.is_organizer ?? false,
      is_secretary: overrides.is_secretary ?? false,
    },
  });
}

async function seedTournamentFixture(
  prisma: PrismaService,
  options: Partial<{
    fighterCount: number;
    nominationFinished: boolean;
    registrationOpen: boolean;
  }> = {},
): Promise<TournamentFixture> {
  const fighterCount = options.fighterCount ?? 4;
  const country = await prisma.countries.create({
    data: { name: 'Georgia' },
  });
  const city = await prisma.cities.create({
    data: { country_id: country.id, name: 'Tbilisi' },
  });
  const nomination = await prisma.nominations.create({
    data: {
      name_ru: `Интеграционная ${fighterCount}`,
      name_en: `Integration ${fighterCount}`,
      is_male: true,
      rounds: 1,
      round_win: false,
    },
  });
  const tournament = await prisma.tournaments.create({
    data: {
      name: 'Integration Cup',
      event_date: new Date('2026-07-28T00:00:00.000Z'),
      country_id: country.id,
      city_id: city.id,
    },
  });
  const tournamentNomination = await prisma.tournament_nominations.create({
    data: {
      tournament_id: tournament.id,
      nomination_id: nomination.id,
      is_open: options.registrationOpen ?? false,
      is_finished: options.nominationFinished ?? false,
      stage: 0,
    },
  });
  const marshalCategory = await prisma.marshals_categories.create({
    data: {
      name_ru: 'Судья',
      name_en: 'Judge',
    },
  });
  const marshal = await prisma.marshals.create({
    data: {
      name: 'Marshal',
      surname: 'One',
      country_id: country.id,
      city_id: city.id,
      category_id: marshalCategory.id,
    },
  });

  await prisma.tournament_marshals.create({
    data: {
      tournament_id: tournament.id,
      marshal_id: marshal.id,
    },
  });

  const fighterIds: number[] = [];
  const competitorIds: number[] = [];

  for (let index = 0; index < fighterCount; index += 1) {
    const fighter = await prisma.fighters.create({
      data: {
        name: `Fighter${index + 1}`,
        surname: 'Integration',
        country_id: country.id,
        city_id: city.id,
        is_male: true,
      },
    });
    const competitor = await prisma.competitors.create({
      data: {
        fighter_id: fighter.id,
        tournament_id: tournament.id,
        nomination_id: nomination.id,
        stage: 0,
      },
    });

    fighterIds.push(fighter.id);
    competitorIds.push(competitor.id);
  }

  return {
    countryId: country.id,
    cityId: city.id,
    nominationId: nomination.id,
    tournamentId: tournament.id,
    tournamentNominationId: tournamentNomination.id,
    fighterIds,
    competitorIds,
    marshalId: marshal.id,
  };
}

function buildDominantResultSubmissions(
  fights: GeneratedFight[],
  competitorIds: number[],
) {
  const rankByCompetitor = new Map(
    competitorIds.map((competitorId, index) => [competitorId, index]),
  );

  return fights.map((fight) => {
    const firstRank = rankByCompetitor.get(fight.competitor1_id);
    const secondRank = rankByCompetitor.get(fight.competitor2_id);

    if (firstRank === undefined || secondRank === undefined) {
      throw new Error('Generated fight contains an unknown competitor.');
    }

    const firstWins = firstRank < secondRank;

    return {
      fight_id: fight.id,
      round_scores: [
        {
          competitor1_score: firstWins ? 3 : 0,
          competitor2_score: firstWins ? 0 : 3,
        },
      ],
    };
  });
}
