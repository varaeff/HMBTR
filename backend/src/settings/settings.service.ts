import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDisciplinaryCardSettingsDto } from './dto/update-disciplinary-card-settings.dto';

export type YellowExpirationMode = 'END_OF_YEAR_MONTH' | 'DAYS';

export interface DisciplinaryCardSettings {
  id: number;
  yellow_expiration_mode: YellowExpirationMode;
  yellow_expiration_month: number;
  yellow_expiration_days: number;
  red_auto_yellow_days: number;
  red_manual_days: number;
  red_manual_with_one_yellow_days: number;
  red_manual_with_two_or_more_yellows_days: number;
  updated_at: Date;
}

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getDisciplinaryCardSettings() {
    return this.ensureDisciplinaryCardSettings();
  }

  async updateDisciplinaryCardSettings(
    dto: UpdateDisciplinaryCardSettingsDto,
  ) {
    await this.prisma.$executeRaw`
      INSERT INTO "disciplinary_card_settings"
        (
          "id",
          "yellow_expiration_mode",
          "yellow_expiration_month",
          "yellow_expiration_days",
          "red_auto_yellow_days",
          "red_manual_days",
          "red_manual_with_one_yellow_days",
          "red_manual_with_two_or_more_yellows_days",
          "updated_at"
        )
      VALUES
        (
          1,
          ${dto.yellow_expiration_mode},
          ${dto.yellow_expiration_month},
          ${dto.yellow_expiration_days},
          ${dto.red_auto_yellow_days},
          ${dto.red_manual_days},
          ${dto.red_manual_with_one_yellow_days},
          ${dto.red_manual_with_two_or_more_yellows_days},
          CURRENT_TIMESTAMP
        )
      ON CONFLICT ("id") DO UPDATE SET
        "yellow_expiration_mode" = EXCLUDED."yellow_expiration_mode",
        "yellow_expiration_month" = EXCLUDED."yellow_expiration_month",
        "yellow_expiration_days" = EXCLUDED."yellow_expiration_days",
        "red_auto_yellow_days" = EXCLUDED."red_auto_yellow_days",
        "red_manual_days" = EXCLUDED."red_manual_days",
        "red_manual_with_one_yellow_days" = EXCLUDED."red_manual_with_one_yellow_days",
        "red_manual_with_two_or_more_yellows_days" = EXCLUDED."red_manual_with_two_or_more_yellows_days",
        "updated_at" = CURRENT_TIMESTAMP
    `;

    return this.ensureDisciplinaryCardSettings();
  }

  private async ensureDisciplinaryCardSettings() {
    const existing = await this.prisma.$queryRaw<DisciplinaryCardSettings[]>`
      SELECT
        "id",
        "yellow_expiration_mode",
        "yellow_expiration_month",
        "yellow_expiration_days",
        "red_auto_yellow_days",
        "red_manual_days",
        "red_manual_with_one_yellow_days",
        "red_manual_with_two_or_more_yellows_days",
        "updated_at"
      FROM "disciplinary_card_settings"
      WHERE "id" = 1
      LIMIT 1
    `;

    if (existing[0]) return existing[0];

    await this.prisma.$executeRaw`
      INSERT INTO "disciplinary_card_settings" ("id", "updated_at")
      VALUES (1, CURRENT_TIMESTAMP)
      ON CONFLICT ("id") DO NOTHING
    `;

    const created = await this.prisma.$queryRaw<DisciplinaryCardSettings[]>`
      SELECT
        "id",
        "yellow_expiration_mode",
        "yellow_expiration_month",
        "yellow_expiration_days",
        "red_auto_yellow_days",
        "red_manual_days",
        "red_manual_with_one_yellow_days",
        "red_manual_with_two_or_more_yellows_days",
        "updated_at"
      FROM "disciplinary_card_settings"
      WHERE "id" = 1
      LIMIT 1
    `;

    return created[0];
  }
}
