import { Injectable } from '@nestjs/common';
import { createMarkdownTable } from '../tournament-report.pdf';
import type {
  GroupStanding,
  TournamentReportBlock,
  TournamentReportFight,
  TournamentReportGroup,
} from '../tournaments-internal.types';
import type { ReportCopy } from './tournament-report-copy';
import { TournamentReportFightScoreFormatter } from './tournament-report-fight-score.formatter';
import {
  formatFighterName,
  getGroupFighterWord,
} from './tournament-report-formatters';

@Injectable()
export class TournamentReportCompetitionFormatter {
  constructor(
    private readonly fightScoreFormatter: TournamentReportFightScoreFormatter,
  ) {}

  appendGroupBlockMarkdown(
    sections: string[],
    block: TournamentReportBlock,
    copy: ReportCopy,
    language: string,
  ) {
    for (const group of block.groups) {
      const fights = block.fights.filter(
        (fight) => fight.group_id === group.id,
      );
      const completedFights = fights.filter(
        (fight) => fight.is_finished,
      ).length;
      const standings = this.getGroupStandings(group, fights);

      sections.push(
        '',
        `#### ${copy.group} ${group.name}`,
        '',
        `${group.fighters.length} ${getGroupFighterWord(
          group.fighters.length,
          language,
          copy,
        )}, ${completedFights}/${fights.length} ${copy.fightsCompleted}`,
        '',
        `**${copy.results}**`,
        '',
        standings.length
          ? createMarkdownTable(
              [copy.place, copy.fighter, copy.wins, copy.diff],
              standings.map((standing, index) => [
                standing.manualPlace ?? index + 1,
                formatFighterName(standing.fighter),
                standing.wins,
                standing.diff,
              ]),
            )
          : copy.noData,
        '',
        `**${copy.fights}**`,
        '',
        fights.length ? this.createFightsTable(fights, copy) : copy.noData,
      );
    }
  }

  appendOlympicBlockMarkdown(
    sections: string[],
    block: TournamentReportBlock,
    copy: ReportCopy,
  ) {
    if (!block.fights.length) {
      sections.push('', copy.noData);
      return;
    }

    const rounds = this.getOlympicRounds(block.fights);
    const finalRound = [...rounds]
      .sort((first, second) => second.round - first.round)
      .find((round) => round.fights.length === 1);
    const preliminaryRounds = finalRound
      ? rounds.filter((round) => round.round !== finalRound.round)
      : rounds;
    const bronzeFights = block.fights
      .filter((fight) => fight.is_bronze)
      .sort(this.compareBracketFights);

    for (const round of preliminaryRounds) {
      sections.push(
        '',
        `### ${this.getOlympicRoundLabel(round.fights, copy)}`,
        '',
        this.createFightsTable(round.fights, copy),
      );
    }

    if (bronzeFights.length) {
      sections.push(
        '',
        `### ${copy.bronzeFight}`,
        '',
        this.createFightsTable(bronzeFights, copy),
      );
    }

    if (finalRound) {
      sections.push(
        '',
        `### ${this.getOlympicRoundLabel(finalRound.fights, copy)}`,
        '',
        this.createFightsTable(finalRound.fights, copy),
      );
    }
  }

  private createFightsTable(fights: TournamentReportFight[], copy: ReportCopy) {
    return createMarkdownTable(
      [
        copy.fightNumber,
        copy.fighter1,
        copy.vs,
        copy.fighter2,
        copy.score,
        copy.winner,
      ],
      fights.map((fight) => [
        fight.fight_number,
        formatFighterName(fight.competitor1.fighter),
        copy.blank,
        formatFighterName(fight.competitor2.fighter),
        fight.is_finished
          ? this.fightScoreFormatter.formatFightScore(fight, copy)
          : '-',
        fight.winner ? formatFighterName(fight.winner.fighter) : '-',
      ]),
    );
  }

  private getGroupStandings(
    group: TournamentReportGroup,
    fights: TournamentReportFight[],
  ): GroupStanding[] {
    const standings = new Map<number, GroupStanding>();
    const manualPlaces = new Map<number, number>(
      group.placements.map((placement) => [
        placement.competitor_id,
        placement.place,
      ]),
    );

    group.fighters.forEach((groupCompetitor) => {
      standings.set(groupCompetitor.competitor_id, {
        competitorId: groupCompetitor.competitor_id,
        fighter: groupCompetitor.competitor.fighter,
        wins: 0,
        diff: 0,
        manualPlace: manualPlaces.get(groupCompetitor.competitor_id),
      });
    });

    fights.forEach((fight) => {
      if (!fight.is_finished) return;
      if (fight.competitor1_id === null || fight.competitor2_id === null) {
        return;
      }

      const first = standings.get(fight.competitor1_id);
      const second = standings.get(fight.competitor2_id);
      const score =
        this.fightScoreFormatter.getEffectiveFightAggregateScore(fight);

      if (first) {
        first.diff += score.competitor1Score - score.competitor2Score;
        if (fight.winner_id === fight.competitor1_id) first.wins++;
      }

      if (second) {
        second.diff += score.competitor2Score - score.competitor1Score;
        if (fight.winner_id === fight.competitor2_id) second.wins++;
      }
    });

    return [...standings.values()].sort((first, second) => {
      const firstPlace = first.manualPlace ?? Number.POSITIVE_INFINITY;
      const secondPlace = second.manualPlace ?? Number.POSITIVE_INFINITY;

      if (firstPlace !== secondPlace) return firstPlace - secondPlace;
      if (first.wins !== second.wins) return second.wins - first.wins;
      if (first.diff !== second.diff) return second.diff - first.diff;

      return formatFighterName(first.fighter).localeCompare(
        formatFighterName(second.fighter),
      );
    });
  }

  private getOlympicRounds(fights: TournamentReportFight[]) {
    const roundMap = new Map<number, TournamentReportFight[]>();

    fights
      .filter((fight) => !fight.is_bronze)
      .forEach((fight) => {
        const round = fight.bracket_round ?? 1;
        roundMap.set(round, [...(roundMap.get(round) ?? []), fight]);
      });

    return [...roundMap.entries()]
      .sort(([firstRound], [secondRound]) => firstRound - secondRound)
      .map(([round, roundFights]) => ({
        round,
        fights: roundFights.sort(this.compareBracketFights),
      }));
  }

  private getOlympicRoundLabel(
    fights: TournamentReportFight[],
    copy: ReportCopy,
  ) {
    switch (fights.length) {
      case 8:
        return copy.oneEighthFinal;
      case 4:
        return copy.oneQuarterFinal;
      case 2:
        return copy.semifinals;
      case 1:
        return copy.final;
      default:
        return copy.round;
    }
  }

  private compareBracketFights(
    this: void,
    first: TournamentReportFight,
    second: TournamentReportFight,
  ) {
    return (first.bracket_position ?? 0) - (second.bracket_position ?? 0);
  }
}
