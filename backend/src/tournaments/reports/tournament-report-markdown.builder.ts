import { Injectable } from '@nestjs/common';
import { createMarkdownTable } from '../tournament-report.pdf';
import type {
  DisciplinaryCard,
  TournamentReport,
} from '../tournaments-internal.types';
import { REPORT_COPY, type ReportCopy } from './tournament-report-copy';
import { TournamentReportCompetitionFormatter } from './tournament-report-competition.formatter';
import {
  formatDate,
  formatFighterName,
  getCardFightLabel,
  getCardTypeLabel,
  getMarshalCategoryName,
  getNominationName,
} from './tournament-report-formatters';

@Injectable()
export class TournamentReportMarkdownBuilder {
  constructor(
    private readonly competitionFormatter: TournamentReportCompetitionFormatter,
  ) {}

  buildReportMarkdown(
    tournament: TournamentReport,
    totalFighters: number,
    language: string,
  ) {
    const copy = REPORT_COPY[language === 'ru' ? 'ru' : 'en'];
    const sections: string[] = [
      `<div style="text-align:center">`,
      '',
      `# ${tournament.name}`,
      '',
      `${tournament.country.name}, ${tournament.city.name} | ${formatDate(
        tournament.event_date,
        copy.notSet,
      )}`,
      '',
      `## ${copy.title}`,
      '',
      `</div>`,
      '',
      `**${copy.name}:** ${tournament.name}`,
      '',
      `**${copy.venue}:** ${tournament.country.name}, ${tournament.city.name}`,
      '',
      `**${copy.date}:** ${formatDate(tournament.event_date, copy.notSet)}`,
      '',
      `**${copy.nominations}:** ${tournament.nominations
        .map((tournamentNomination) =>
          getNominationName(tournamentNomination.nomination, language),
        )
        .join(', ')}`,
      '',
      `**${copy.totalFighters}:** ${totalFighters}`,
    ];

    this.appendMarshalsMarkdown(sections, tournament, copy, language);
    this.appendDisciplinaryCardsMarkdown(
      sections,
      tournament.disciplinary_cards,
      copy,
      language,
    );

    for (const tournamentNomination of tournament.nominations) {
      const nominationName = getNominationName(
        tournamentNomination.nomination,
        language,
      );
      const nominationCompetitors = tournament.competitors.filter(
        (competitor) =>
          competitor.nomination_id === tournamentNomination.nomination_id,
      );

      sections.push(
        '',
        `## ${copy.nomination}: ${nominationName}`,
        '',
        `**${copy.registeredFighters}:** ${nominationCompetitors.length}`,
        '',
        `### ${copy.finalResults}`,
        '',
      );

      if (tournamentNomination.placements.length) {
        sections.push(
          createMarkdownTable(
            [copy.place, copy.fighter],
            tournamentNomination.placements.map((placement) => [
              placement.place,
              formatFighterName(placement.competitor.fighter),
            ]),
          ),
        );
      } else {
        sections.push(copy.noFinalResults);
      }

      for (const block of tournamentNomination.blocks) {
        if (block.type === 'GROUP') {
          sections.push('', `### ${copy.groupStage} ${block.stage}`, '');
          this.competitionFormatter.appendGroupBlockMarkdown(
            sections,
            block,
            copy,
            language,
          );
        } else {
          this.competitionFormatter.appendOlympicBlockMarkdown(
            sections,
            block,
            copy,
          );
        }
      }
    }

    return sections.join('\n');
  }

  private appendMarshalsMarkdown(
    sections: string[],
    tournament: TournamentReport,
    copy: ReportCopy,
    language: string,
  ) {
    sections.push('', `## ${copy.marshals}`, '');

    if (!tournament.marshals.length) {
      sections.push(copy.noMarshals);
      return;
    }

    sections.push(
      createMarkdownTable(
        [copy.marshal, copy.category, copy.country, copy.city],
        tournament.marshals.map((tournamentMarshal) => [
          formatFighterName(tournamentMarshal.marshal),
          getMarshalCategoryName(tournamentMarshal.marshal.category, language),
          tournamentMarshal.marshal.country.name,
          tournamentMarshal.marshal.city.name,
        ]),
      ),
    );
  }

  private appendDisciplinaryCardsMarkdown(
    sections: string[],
    cards: DisciplinaryCard[],
    copy: ReportCopy,
    language: string,
  ) {
    sections.push('', `## ${copy.disciplinaryCards}`, '');

    if (!cards.length) {
      sections.push(copy.noDisciplinaryCards);
      return;
    }

    sections.push(
      createMarkdownTable(
        [copy.cardType, copy.fighter, copy.nomination, copy.fight, copy.reason],
        cards.map((card) => [
          getCardTypeLabel(card.type, copy),
          formatFighterName(card.fighter),
          getNominationName(card.fight.nomination, language),
          getCardFightLabel(card.fight),
          card.reason,
        ]),
      ),
    );
  }
}
