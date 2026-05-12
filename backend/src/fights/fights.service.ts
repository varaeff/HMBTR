import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFightDto } from './dto/create-fight.dto';
import { UpdateFightScoresDto } from './dto/update-fight-scores.dto';
import { SetFightWinnerDto } from './dto/set-fight-winner.dto';

@Injectable()
export class FightsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateFightDto) {
    const tournament = await this.prisma.tournaments.findUnique({
      where: { id: dto.tournament_id },
    });

    if (!tournament) throw new NotFoundException('Tournament not found');

    const nomination = await this.prisma.nominations.findUnique({
      where: { id: dto.nomination_id },
    });

    if (!nomination) throw new NotFoundException('Nomination not found');

    const competitor1 = await this.prisma.competitors.findUnique({
      where: { id: dto.competitor1_id },
    });

    if (!competitor1) throw new NotFoundException('Competitor 1 not found');

    const competitor2 = await this.prisma.competitors.findUnique({
      where: { id: dto.competitor2_id },
    });

    if (!competitor2) throw new NotFoundException('Competitor 2 not found');

    if (dto.competitor1_id === dto.competitor2_id) {
      throw new BadRequestException(
        'Competitor 1 and Competitor 2 must be different',
      );
    }

    if (dto.group_id) {
      const group = await this.prisma.groups.findUnique({
        where: { id: dto.group_id },
      });

      if (!group) throw new NotFoundException('Group not found');
    }

    return this.prisma.fights.create({
      data: {
        tournament_id: dto.tournament_id,
        nomination_id: dto.nomination_id,
        group_id: dto.group_id || null,
        competitor1_id: dto.competitor1_id,
        competitor2_id: dto.competitor2_id,
        stage: dto.stage,
        fight_number: dto.fight_number,
      },
    });
  }

  async findAll() {
    return this.prisma.fights.findMany();
  }

  async findById(id: number) {
    const fight = await this.prisma.fights.findUnique({
      where: { id },
    });

    if (!fight) throw new NotFoundException('Fight not found');

    return fight;
  }

  async findByTournament(tournamentId: number) {
    return this.prisma.fights.findMany({
      where: { tournament_id: tournamentId },
    });
  }

  async findByGroup(groupId: number) {
    const group = await this.prisma.groups.findUnique({
      where: { id: groupId },
    });

    if (!group) throw new NotFoundException('Group not found');

    return this.prisma.fights.findMany({
      where: { group_id: groupId },
    });
  }

  async updateScores(dto: UpdateFightScoresDto) {
    const fight = await this.prisma.fights.findUnique({
      where: { id: dto.fight_id },
    });

    if (!fight) throw new NotFoundException('Fight not found');

    return this.prisma.fights.update({
      where: { id: dto.fight_id },
      data: {
        ...(dto.competitor1_score !== undefined && {
          competitor1_score: dto.competitor1_score,
        }),
        ...(dto.competitor2_score !== undefined && {
          competitor2_score: dto.competitor2_score,
        }),
      },
    });
  }

  async setWinner(dto: SetFightWinnerDto) {
    const fight = await this.prisma.fights.findUnique({
      where: { id: dto.fight_id },
    });

    if (!fight) throw new NotFoundException('Fight not found');

    const winner = await this.prisma.competitors.findUnique({
      where: { id: dto.winner_id },
    });

    if (!winner) throw new NotFoundException('Winner competitor not found');

    if (
      dto.winner_id !== fight.competitor1_id &&
      dto.winner_id !== fight.competitor2_id
    ) {
      throw new BadRequestException(
        'Winner must be one of the fight competitors',
      );
    }

    return this.prisma.fights.update({
      where: { id: dto.fight_id },
      data: {
        winner_id: dto.winner_id,
        is_finished: true,
      },
    });
  }

  async finishFight(id: number) {
    const fight = await this.prisma.fights.findUnique({
      where: { id },
    });

    if (!fight) throw new NotFoundException('Fight not found');

    return this.prisma.fights.update({
      where: { id },
      data: {
        is_finished: true,
      },
    });
  }
}
