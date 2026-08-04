import { Module } from '@nestjs/common';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TournamentCrudService } from './core/tournament-crud.service';
import { TournamentMarshalService } from './marshals/tournament-marshal.service';
import { TournamentNominationService } from './nominations/tournament-nomination.service';
import { TournamentReportCompetitionFormatter } from './reports/tournament-report-competition.formatter';
import { TournamentReportFightScoreFormatter } from './reports/tournament-report-fight-score.formatter';
import { TournamentReportMarkdownBuilder } from './reports/tournament-report-markdown.builder';
import { TournamentReportReader } from './reports/tournament-report-reader.service';
import { TournamentReportStorage } from './reports/tournament-report-storage.service';
import { TournamentReportService } from './reports/tournament-report.service';

@Module({
  imports: [PrismaModule],
  controllers: [TournamentsController],
  providers: [
    TournamentsService,
    TournamentCrudService,
    TournamentNominationService,
    TournamentMarshalService,
    TournamentReportService,
    TournamentReportStorage,
    TournamentReportReader,
    TournamentReportMarkdownBuilder,
    TournamentReportCompetitionFormatter,
    TournamentReportFightScoreFormatter,
  ],
})
export class TournamentsModule {}
