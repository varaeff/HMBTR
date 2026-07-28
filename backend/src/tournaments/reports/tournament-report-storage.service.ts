import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CachedReportRow,
  ReportStorageRow,
  TournamentReportResult,
} from '../tournaments-internal.types';

@Injectable()
export class TournamentReportStorage {
  constructor(private readonly prisma: PrismaService) {}

  async assertReportStorageReady() {
    const [reportStorage] = await this.prisma.$queryRawUnsafe<
      ReportStorageRow[]
    >(`SELECT to_regclass('public.tournament_reports')::text AS "table_name"`);

    if (!reportStorage?.table_name) {
      throw new BadRequestException(
        'Tournament report storage is not ready. Run the 2_tournament_reports Prisma migration.',
      );
    }
  }

  async getCachedReport(
    tournamentId: number,
    language: string,
  ): Promise<TournamentReportResult | null> {
    const [cached] = await this.prisma.$queryRawUnsafe<CachedReportRow[]>(
      `
        SELECT "file_name", encode("pdf_data", 'base64') AS "pdf_data_base64"
        FROM "tournament_reports"
        WHERE "tournament_id" = $1 AND "language" = $2
        LIMIT 1
      `,
      tournamentId,
      language,
    );

    if (!cached) return null;

    return {
      fileName: cached.file_name,
      pdf: Buffer.from(cached.pdf_data_base64, 'base64'),
    };
  }

  async saveReport(
    tournamentId: number,
    language: string,
    fileName: string,
    pdf: Buffer,
  ) {
    await this.prisma.$executeRawUnsafe(
      `
        INSERT INTO "tournament_reports" ("tournament_id", "language", "file_name", "pdf_data")
        VALUES ($1, $2, $3, decode($4, 'base64'))
        ON CONFLICT ("tournament_id", "language")
        DO UPDATE SET
          "file_name" = EXCLUDED."file_name",
          "pdf_data" = EXCLUDED."pdf_data",
          "generated_at" = CURRENT_TIMESTAMP
      `,
      tournamentId,
      language,
      fileName,
      Buffer.from(pdf).toString('base64'),
    );
  }
}
