import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const RATING_ORDER = [
  { rating: 'desc' as const },
  { fights_count: 'desc' as const },
  { fighter: { surname: 'asc' as const } },
  { fighter: { name: 'asc' as const } },
  { fighter_id: 'asc' as const },
];

@Injectable()
export class RatingLeaderboardService {
  constructor(private prisma: PrismaService) {}

  async findRatedNominations() {
    return this.prisma.nominations.findMany({
      where: {
        fighter_ratings: {
          some: {},
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  async findByNomination(nominationId: number) {
    return this.prisma.fighter_nomination_ratings.findMany({
      where: { nomination_id: nominationId },
      orderBy: RATING_ORDER,
      include: {
        fighter: {
          include: {
            country: true,
            city: true,
            club: true,
          },
        },
      },
    });
  }
}
