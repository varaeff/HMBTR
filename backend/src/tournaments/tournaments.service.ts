import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { AddNominationDto } from './dto/add-nomination.dto';
import { UpdateNominationDto } from './dto/update-nomination.dto';
import { UpdateNominationStageDto } from './dto/update-nomination-stage.dto';
import {
  createMarkdownTable,
  createReportFileName,
  createTournamentReportPdf,
} from './tournament-report.pdf';

type CachedReportRow = {
  file_name: string;
  pdf_data_base64: string;
};

type ReportStorageRow = {
  table_name: string | null;
};

type FighterName = {
  name: string;
  surname: string;
  patronymic?: string | null;
};

type NominationDefinition = {
  name_en: string;
  name_ru: string;
};

type GroupStanding = {
  competitorId: number;
  fighter: FighterName;
  wins: number;
  diff: number;
  manualPlace?: number;
};

type Fight = {
  fight_number: number;
  group_id: number | null;
  competitor1_id: number | null;
  competitor2_id: number | null;
  competitor1_score: number;
  competitor2_score: number;
  bracket_round: number | null;
  bracket_position: number | null;
  is_bronze: boolean;
  is_finished: boolean;
  competitor1: { fighter: FighterName };
  competitor2: { fighter: FighterName };
  winner: { fighter: FighterName } | null;
};

type Group = {
  id: number;
  name: string;
  fighters: {
    competitor_id: number;
    competitor: { fighter: FighterName };
  }[];
  placements: {
    place: number;
    competitor_id: number;
  }[];
};

type Block = {
  type: string;
  stage: number;
  groups: Group[];
  fights: Fight[];
};

type Nomination = {
  nomination_id: number;
  nomination: NominationDefinition;
  placements: {
    place: number;
    competitor: { fighter: FighterName };
  }[];
  blocks: Block[];
};

type Tournament = {
  name: string;
  event_date: Date | null;
  country: { name: string };
  city: { name: string };
  competitors: {
    nomination_id: number;
  }[];
  nominations: Nomination[];
};

const SCOPE_FINAL = 'FINAL';
const SCOPE_GROUP = 'GROUP';

const REPORT_COPY = {
  en: {
    title: 'Tournament Results Report',
    name: 'Name',
    venue: 'Venue',
    date: 'Date',
    nominations: 'Nominations',
    totalFighters: 'Total fighters',
    nomination: 'Nomination',
    registeredFighters: 'Registered fighters',
    finalResults: 'Final results',
    noFinalResults: 'No final placements were saved.',
    groupStage: 'Group stage',
    olympicStage: 'Olympic stage',
    oneEighthFinal: '1/8 final',
    oneQuarterFinal: '1/4 final',
    semifinals: 'Semifinals',
    final: 'Final',
    round: 'Round',
    bronzeFight: 'Bronze fight',
    group: 'Group',
    results: 'Results',
    fights: 'Fights',
    place: 'Place',
    fighter: 'Fighter',
    wins: 'Wins',
    diff: 'Diff',
    fighter1: 'Fighter1',
    vs: '  VS  ',
    blank: '      ',
    fighter2: 'Fighter2',
    score: 'Score',
    winner: 'Winner',
    fightsCompleted: 'fights completed',
    noData: 'No data',
    notSet: 'Not set',
  },
  ru: {
    title: 'Отчет о результатах турнира',
    name: 'Название',
    venue: 'Место проведения',
    date: 'Дата',
    nominations: 'Номинации',
    totalFighters: 'Всего бойцов',
    nomination: 'Номинация',
    registeredFighters: 'Зарегистрировано бойцов',
    finalResults: 'Итоговые результаты',
    noFinalResults: 'Итоговые места не сохранены.',
    groupStage: 'Групповой этап',
    olympicStage: 'Олимпийская сетка',
    oneEighthFinal: '1/8 финала',
    oneQuarterFinal: '1/4 финала',
    semifinals: 'Полуфиналы',
    final: 'Финал',
    round: 'Раунд',
    bronzeFight: 'Бой за 3-е место',
    group: 'Группа',
    results: 'Результаты',
    fights: 'Бои',
    place: 'Место',
    fighter: 'Боец',
    wins: 'Победы',
    diff: 'Разница',
    fighter1: 'Боец 1',
    vs: '  VS  ',
    blank: '      ',
    fighter2: 'Боец 2',
    score: 'Счет',
    winner: 'Победитель',
    fightsCompleted: 'боев завершено',
    noData: 'Нет данных',
    notSet: 'Не указано',
  },
} as const;

type ReportCopy = (typeof REPORT_COPY)[keyof typeof REPORT_COPY];

@Injectable()
export class TournamentsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tournaments.findMany();
  }

  async getCount() {
    return this.prisma.tournaments.count();
  }

  async findOne(id: number) {
    const tournament = await this.prisma.tournaments.findUnique({
      where: { id },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');
    return tournament;
  }

  async create(dto: CreateTournamentDto) {
    const eventDate = new Date(dto.event_date);

    const exists = await this.prisma.tournaments.findFirst({
      where: {
        name: dto.name,
        event_date: eventDate,
        city_id: dto.city_id,
      },
      select: { id: true },
    });

    if (exists) throw new BadRequestException('Tournament already exists');

    return this.prisma.tournaments.create({
      data: {
        ...dto,
        event_date: eventDate,
      },
    });
  }

  async getNominations(tournamentId: number) {
    return this.prisma.tournament_nominations.findMany({
      where: { tournament_id: tournamentId },
    });
  }

  async getTournamentReport(tournamentId: number, language = 'en') {
    const reportLanguage = language === 'ru' ? 'ru' : 'en';

    await this.assertReportStorageReady();

    const cached = await this.getCachedReport(tournamentId, reportLanguage);

    if (cached) return cached;

    const tournament = await this.prisma.tournaments.findUnique({
      where: { id: tournamentId },
      include: {
        country: true,
        city: true,
        competitors: true,
        nominations: {
          orderBy: { nomination_id: 'asc' },
          include: {
            nomination: true,
            placements: {
              where: { scope: SCOPE_FINAL },
              orderBy: { place: 'asc' },
              include: {
                competitor: {
                  include: { fighter: true },
                },
              },
            },
            blocks: {
              orderBy: { stage: 'asc' },
              include: {
                groups: {
                  orderBy: { name: 'asc' },
                  include: {
                    fighters: {
                      include: {
                        competitor: {
                          include: { fighter: true },
                        },
                      },
                    },
                    placements: {
                      where: { scope: SCOPE_GROUP },
                      orderBy: { place: 'asc' },
                    },
                  },
                },
                fights: {
                  orderBy: [
                    { fight_number: 'asc' },
                    { bracket_round: 'asc' },
                    { bracket_position: 'asc' },
                  ],
                  include: {
                    competitor1: { include: { fighter: true } },
                    competitor2: { include: { fighter: true } },
                    winner: { include: { fighter: true } },
                  },
                },
                bracket_slots: {
                  orderBy: { slot_position: 'asc' },
                  include: {
                    competitor: {
                      include: { fighter: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!tournament) throw new NotFoundException('Tournament not found');
    if (!tournament.nominations.length) {
      throw new BadRequestException('Tournament has no nominations');
    }
    if (tournament.nominations.some((nomination) => !nomination.is_finished)) {
      throw new BadRequestException(
        'All tournament nominations must be completed',
      );
    }

    const uniqueFighters = await this.prisma.competitors.findMany({
      where: { tournament_id: tournamentId },
      distinct: ['fighter_id'],
      select: { fighter_id: true },
    });
    const fileName = createReportFileName(tournament.name, reportLanguage);
    const markdown = this.buildReportMarkdown(
      tournament,
      uniqueFighters.length,
      reportLanguage,
    );
    const pdf = await createTournamentReportPdf(markdown, fileName);

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
      reportLanguage,
      fileName,
      Buffer.from(pdf).toString('base64'),
    );

    return { fileName, pdf };
  }

  async addNomination(dto: AddNominationDto) {
    return this.prisma.tournament_nominations.create({
      data: {
        ...dto,
      },
    });
  }

  async updateNomination(dto: UpdateNominationDto) {
    const nomination = await this.prisma.tournament_nominations.findFirst({
      where: {
        tournament_id: dto.tournament_id,
        nomination_id: dto.nomination_id,
      },
    });

    if (!nomination) throw new NotFoundException('Nomination not found');

    return this.prisma.tournament_nominations.update({
      where: { id: nomination.id },
      data: {
        is_open: dto.is_open,
      },
    });
  }

  async updateNominationStage(dto: UpdateNominationStageDto) {
    const nomination = await this.prisma.tournament_nominations.findUnique({
      where: { id: dto.nomination_id },
    });

    if (!nomination) throw new NotFoundException('Nomination not found');

    return this.prisma.tournament_nominations.update({
      where: { id: dto.nomination_id },
      data: {
        stage: dto.stage,
      },
    });
  }

  private async getCachedReport(tournamentId: number, language: string) {
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

  private async assertReportStorageReady() {
    const [reportStorage] = await this.prisma.$queryRawUnsafe<
      ReportStorageRow[]
    >(`SELECT to_regclass('public.tournament_reports')::text AS "table_name"`);

    if (!reportStorage?.table_name) {
      throw new BadRequestException(
        'Tournament report storage is not ready. Run the 2_tournament_reports Prisma migration.',
      );
    }
  }

  private buildReportMarkdown(
    tournament: Tournament,
    totalFighters: number,
    language: string,
  ) {
    const copy = REPORT_COPY[language === 'ru' ? 'ru' : 'en'];
    const sections: string[] = [
      `<div style="text-align:center">`,
      '',
      `# ${tournament.name}`,
      '',
      `${tournament.country.name}, ${tournament.city.name} | ${this.formatDate(tournament.event_date, copy.notSet)}`,
      '',
      `## ${copy.title}`,
      '',
      `</div>`,
      '',
      `**${copy.name}:** ${tournament.name}`,
      '',
      `**${copy.venue}:** ${tournament.country.name}, ${tournament.city.name}`,
      '',
      `**${copy.date}:** ${this.formatDate(tournament.event_date, copy.notSet)}`,
      '',
      `**${copy.nominations}:** ${tournament.nominations
        .map((tournamentNomination) =>
          this.getNominationName(tournamentNomination.nomination, language),
        )
        .join(', ')}`,
      '',
      `**${copy.totalFighters}:** ${totalFighters}`,
    ];

    for (const tournamentNomination of tournament.nominations) {
      const nominationName: string = this.getNominationName(
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
              this.formatFighterName(placement.competitor.fighter),
            ]),
          ),
        );
      } else {
        sections.push(copy.noFinalResults);
      }

      for (const block of tournamentNomination.blocks) {
        if (block.type === 'GROUP') {
          sections.push('', `### ${copy.groupStage} ${block.stage}`, '');
          this.appendGroupBlockMarkdown(sections, block, copy, language);
        } else {
          this.appendOlympicBlockMarkdown(sections, block, copy);
        }
      }
    }

    return sections.join('\n');
  }

  private appendGroupBlockMarkdown(
    sections: string[],
    block: Block,
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
        `${group.fighters.length} ${this.getGroupFighterWord(
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
                this.formatFighterName(standing.fighter),
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

  private appendOlympicBlockMarkdown(
    sections: string[],
    block: Block,
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

  private createFightsTable(fights: Fight[], copy: ReportCopy) {
    return createMarkdownTable(
      [copy.fighter1, copy.vs, copy.fighter2, copy.score, copy.winner],
      fights.map((fight) => [
        this.formatFighterName(fight.competitor1.fighter),
        copy.blank,
        this.formatFighterName(fight.competitor2.fighter),
        fight.is_finished
          ? `${fight.competitor1_score}:${fight.competitor2_score}`
          : '-',
        fight.winner ? this.formatFighterName(fight.winner.fighter) : '-',
      ]),
    );
  }

  private getGroupStandings(group: Group, fights: Fight[]): GroupStanding[] {
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

      if (first) {
        first.diff += fight.competitor1_score - fight.competitor2_score;
        if (fight.competitor1_score > fight.competitor2_score) first.wins++;
      }

      if (second) {
        second.diff += fight.competitor2_score - fight.competitor1_score;
        if (fight.competitor2_score > fight.competitor1_score) second.wins++;
      }
    });

    return [...standings.values()].sort((first, second) => {
      const firstPlace = first.manualPlace ?? Number.POSITIVE_INFINITY;
      const secondPlace = second.manualPlace ?? Number.POSITIVE_INFINITY;

      if (firstPlace !== secondPlace) return firstPlace - secondPlace;
      if (first.wins !== second.wins) return second.wins - first.wins;
      if (first.diff !== second.diff) return second.diff - first.diff;

      return this.formatFighterName(first.fighter).localeCompare(
        this.formatFighterName(second.fighter),
      );
    });
  }

  private getOlympicRounds(fights: Fight[]) {
    const roundMap = new Map<number, Fight[]>();

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

  private getOlympicRoundLabel(fights: Fight[], copy: ReportCopy) {
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

  private compareBracketFights(this: void, first: Fight, second: Fight) {
    return (first.bracket_position ?? 0) - (second.bracket_position ?? 0);
  }

  private getGroupFighterWord(
    count: number,
    language: string,
    copy: ReportCopy,
  ) {
    if (language !== 'ru') return copy.fighter.toLowerCase();

    return count === 3 || count === 4 ? 'бойца' : 'бойцов';
  }

  private getNominationName(
    nomination: NominationDefinition,
    language: string,
  ) {
    return language === 'ru' ? nomination.name_ru : nomination.name_en;
  }

  private formatDate(date: Date | string | null, fallback = 'Not set') {
    if (!date) return fallback;
    return new Date(date).toISOString().slice(0, 10);
  }

  private formatFighterName(fighter: FighterName) {
    return [fighter.surname, fighter.name, fighter.patronymic]
      .filter(Boolean)
      .join(' ');
  }
}
