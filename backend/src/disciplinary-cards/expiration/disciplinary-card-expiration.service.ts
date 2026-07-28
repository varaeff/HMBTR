import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../settings/settings.service';
import { CARD_YELLOW, SOURCE_AUTOMATIC } from '../disciplinary-card.constants';
import type {
  DisciplinaryCardSource,
  DisciplinaryCardType,
} from '../disciplinary-card.types';

@Injectable()
export class DisciplinaryCardExpirationService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
  ) {}

  async calculateExpiration(
    type: DisciplinaryCardType,
    fighterId: number,
    receivedAt: Date,
    source: DisciplinaryCardSource,
    excludeCardId: number | null = null,
  ) {
    const settings = await this.settingsService.getDisciplinaryCardSettings();

    if (type === CARD_YELLOW) {
      if (settings.yellow_expiration_mode === 'DAYS') {
        return this.addDays(receivedAt, settings.yellow_expiration_days);
      }

      return this.lastDayOfExpirationMonth(
        receivedAt,
        settings.yellow_expiration_month,
      );
    }

    if (source === SOURCE_AUTOMATIC) {
      return this.addDays(receivedAt, settings.red_auto_yellow_days);
    }

    const activeYellowRows = await this.prisma.$queryRaw<Array<{ id: number }>>`
      SELECT "id"
      FROM "disciplinary_cards"
      WHERE "fighter_id" = ${fighterId}
        AND "type" = 'YELLOW'
        AND "active" = true
        AND (${excludeCardId}::int IS NULL OR "id" <> ${excludeCardId}::int)
        AND "received_at" <= ${receivedAt}
        AND "expires_at" >= ${receivedAt}
    `;

    if (activeYellowRows.length >= 2) {
      return this.addDays(
        receivedAt,
        settings.red_manual_with_two_or_more_yellows_days,
      );
    }
    if (activeYellowRows.length === 1) {
      return this.addDays(receivedAt, settings.red_manual_with_one_yellow_days);
    }

    return this.addDays(receivedAt, settings.red_manual_days);
  }

  async getTournamentCheckDate(tournamentId: number) {
    const tournament = await this.prisma.tournaments.findUnique({
      where: { id: tournamentId },
      select: { event_date: true },
    });

    if (!tournament) throw new NotFoundException('Tournament not found');

    return tournament.event_date
      ? this.toDateOnly(tournament.event_date)
      : this.toDateOnly(new Date());
  }

  toDateOnly(value: string | Date) {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }

    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  addDays(date: Date, days: number) {
    const result = this.toDateOnly(date);
    result.setUTCDate(result.getUTCDate() + days);

    return result;
  }

  private lastDayOfExpirationMonth(date: Date, month: number) {
    const receivedAt = this.toDateOnly(date);
    const expirationMonthIndex = month - 1;
    let year = receivedAt.getUTCFullYear();
    const buildExpiration = () =>
      new Date(Date.UTC(year, expirationMonthIndex + 1, 0));
    let expiration = buildExpiration();

    if (expiration.getTime() < receivedAt.getTime()) {
      year++;
      expiration = buildExpiration();
    }

    return expiration;
  }
}
