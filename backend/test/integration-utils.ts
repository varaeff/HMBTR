import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import * as bodyParser from 'body-parser';
import type { App } from 'supertest/types';
import type { Response } from 'supertest';
import { AppModule } from '../src/app/app.module';
import { EmailService } from '../src/common/services/email.service';
import { PrismaService } from '../src/prisma/prisma.service';

export interface IntegrationApp {
  app: INestApplication;
  prisma: PrismaService;
  server: App;
}

export const apiPath = (path: string) => `/api/hmbtr/v1${path}`;

export const bearer = (token: string) => `Bearer ${token}`;

export const responseBody = <T>(response: Response): T =>
  response.body as unknown as T;

export async function createIntegrationApp(): Promise<IntegrationApp> {
  const emailMock: Pick<EmailService, 'sendMail' | 'sendNewUserNotification'> =
    {
      sendMail: jest.fn<Promise<void>, Parameters<EmailService['sendMail']>>(),
      sendNewUserNotification: jest.fn<
        Promise<void>,
        Parameters<EmailService['sendNewUserNotification']>
      >(),
    };

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EmailService)
    .useValue(emailMock)
    .compile();

  const app = moduleRef.createNestApplication();
  app.use(bodyParser.json({ limit: '50mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api/hmbtr/v1');
  await app.init();

  return {
    app,
    prisma: app.get(PrismaService),
    server: app.getHttpServer() as App,
  };
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.tournament_reports.deleteMany();
  await prisma.red_card_yellow_sources.deleteMany();
  await prisma.disciplinary_cards.deleteMany();
  await prisma.fight_warnings.deleteMany();
  await prisma.fight_round_scores.deleteMany();
  await prisma.competition_placements.deleteMany();
  await prisma.competition_round_states.deleteMany();
  await prisma.bracket_slots.deleteMany();
  await prisma.fights.deleteMany();
  await prisma.group_competitors.deleteMany();
  await prisma.groups.deleteMany();
  await prisma.competitors.deleteMany();
  await prisma.competition_blocks.deleteMany();
  await prisma.tournament_marshals.deleteMany();
  await prisma.fighter_nomination_rating_history.deleteMany();
  await prisma.fighter_nomination_ratings.deleteMany();
  await prisma.tournament_nominations.deleteMany();
  await prisma.tournaments.deleteMany();
  await prisma.marshals.deleteMany();
  await prisma.marshals_categories.deleteMany();
  await prisma.fighters.deleteMany();
  await prisma.clubs.deleteMany();
  await prisma.cities.deleteMany();
  await prisma.countries.deleteMany();
  await prisma.nominations.deleteMany();
  await prisma.users.deleteMany();
  await prisma.disciplinary_card_settings.deleteMany();
}
