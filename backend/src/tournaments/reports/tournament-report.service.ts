import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createReportFileName,
  createTournamentReportPdf,
} from '../tournament-report.pdf';
import type { TournamentReportResult } from '../tournaments-internal.types';
import { TournamentReportMarkdownBuilder } from './tournament-report-markdown.builder';
import { TournamentReportReader } from './tournament-report-reader.service';
import { TournamentReportStorage } from './tournament-report-storage.service';

@Injectable()
export class TournamentReportService {
  constructor(
    private readonly storage: TournamentReportStorage,
    private readonly reader: TournamentReportReader,
    private readonly markdownBuilder: TournamentReportMarkdownBuilder,
  ) {}

  async getTournamentReport(
    tournamentId: number,
    language = 'en',
  ): Promise<TournamentReportResult> {
    const reportLanguage = language === 'ru' ? 'ru' : 'en';

    await this.storage.assertReportStorageReady();

    const cached = await this.storage.getCachedReport(
      tournamentId,
      reportLanguage,
    );

    if (cached) return cached;

    const tournament = await this.reader.findReportTournament(tournamentId);

    if (!tournament) throw new NotFoundException('Tournament not found');
    if (!tournament.nominations.length) {
      throw new BadRequestException('Tournament has no nominations');
    }
    if (tournament.nominations.some((nomination) => !nomination.is_finished)) {
      throw new BadRequestException(
        'All tournament nominations must be completed',
      );
    }

    const totalFighters = await this.reader.countUniqueFighters(tournamentId);
    const fileName = createReportFileName(tournament.name, reportLanguage);
    const markdown = this.markdownBuilder.buildReportMarkdown(
      tournament,
      totalFighters,
      reportLanguage,
    );
    const pdf = await createTournamentReportPdf(markdown, fileName);

    await this.storage.saveReport(tournamentId, reportLanguage, fileName, pdf);

    return { fileName, pdf };
  }
}
