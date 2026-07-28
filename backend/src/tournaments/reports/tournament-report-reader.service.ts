import { Injectable } from '@nestjs/common';
import { SCOPE_FINAL, SCOPE_GROUP } from '../tournament.constants';
import type { TournamentReport } from '../tournaments-internal.types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TournamentReportReader {
  constructor(private readonly prisma: PrismaService) {}

  async findReportTournament(
    tournamentId: number,
  ): Promise<TournamentReport | null> {
    return this.prisma.tournaments.findUnique({
      where: { id: tournamentId },
      include: {
        country: true,
        city: true,
        competitors: true,
        marshals: {
          orderBy: { created_at: 'asc' },
          include: {
            marshal: {
              include: {
                category: true,
                country: true,
                city: true,
              },
            },
          },
        },
        disciplinary_cards: {
          orderBy: [{ received_at: 'asc' }, { id: 'asc' }],
          include: {
            fighter: true,
            fight: {
              include: {
                nomination: true,
              },
            },
          },
        },
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
                    nomination: true,
                    warnings: { orderBy: { id: 'asc' } },
                    round_scores: { orderBy: { round: 'asc' } },
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
  }

  async countUniqueFighters(tournamentId: number) {
    const uniqueFighters = await this.prisma.competitors.findMany({
      where: { tournament_id: tournamentId },
      distinct: ['fighter_id'],
      select: { fighter_id: true },
    });

    return uniqueFighters.length;
  }
}
