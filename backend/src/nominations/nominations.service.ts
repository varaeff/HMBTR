import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNominationDto } from './dto/create-nomination.dto';
import { UpdateNominationDto } from './dto/update-nomination.dto';

@Injectable()
export class NominationsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const nominations = await this.prisma.nominations.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: {
          select: {
            tournaments: true,
          },
        },
      },
    });

    return nominations.map((nomination) => ({
      id: nomination.id,
      name_ru: nomination.name_ru,
      name_en: nomination.name_en,
      is_male: nomination.is_male,
      rounds: nomination.rounds,
      round_win: nomination.round_win,
      tournaments_count: nomination._count.tournaments,
      can_delete: nomination._count.tournaments === 0,
    }));
  }

  async create(dto: CreateNominationDto) {
    this.validateScoring(dto.rounds, dto.round_win);
    await this.ensureNameIsUnique(dto.name_ru, dto.name_en, dto.is_male);

    return this.prisma.nominations.create({ data: dto });
  }

  async update(id: number, dto: UpdateNominationDto) {
    const nomination = await this.prisma.nominations.findUnique({
      where: { id },
    });
    if (!nomination) throw new NotFoundException('Nomination not found');

    const rounds = dto.rounds ?? nomination.rounds;
    const roundWin = dto.round_win ?? nomination.round_win;
    this.validateScoring(rounds, roundWin);
    await this.ensureNameIsUnique(
      dto.name_ru ?? nomination.name_ru,
      dto.name_en ?? nomination.name_en,
      dto.is_male ?? nomination.is_male,
      id,
    );

    const scoringChanged =
      (dto.rounds !== undefined && dto.rounds !== nomination.rounds) ||
      (dto.round_win !== undefined && dto.round_win !== nomination.round_win);
    if (scoringChanged && !dto.confirm_existing_fights) {
      const fightsCount = await this.prisma.fights.count({
        where: { nomination_id: id },
      });
      if (fightsCount > 0) {
        throw new ConflictException({
          details: {
            code: 'NOMINATION_HAS_EXISTING_FIGHTS',
            fights_count: fightsCount,
          },
          error: 'Conflict',
        });
      }
    }

    return this.prisma.nominations.update({
      where: { id },
      data: {
        ...(dto.name_ru !== undefined ? { name_ru: dto.name_ru } : {}),
        ...(dto.name_en !== undefined ? { name_en: dto.name_en } : {}),
        ...(dto.is_male !== undefined ? { is_male: dto.is_male } : {}),
        ...(dto.rounds !== undefined ? { rounds: dto.rounds } : {}),
        ...(dto.round_win !== undefined ? { round_win: dto.round_win } : {}),
      },
    });
  }

  async delete(id: number) {
    const nomination = await this.prisma.nominations.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tournaments: true,
          },
        },
      },
    });
    if (!nomination) throw new NotFoundException('Nomination not found');
    if (nomination._count.tournaments > 0) {
      throw new BadRequestException(
        'Cannot delete nomination used in tournaments',
      );
    }

    await this.prisma.nominations.delete({ where: { id } });
  }

  private validateScoring(rounds: number, roundWin: boolean) {
    if (![1, 2, 3].includes(rounds)) {
      throw new BadRequestException('Nomination rounds must be 1, 2 or 3');
    }
    if (roundWin && rounds !== 3) {
      throw new BadRequestException(
        'Round-win scoring is available only for 3 rounds',
      );
    }
  }

  private async ensureNameIsUnique(
    nameRu: string,
    nameEn: string,
    isMale: boolean,
    excludeId?: number,
  ) {
    const duplicate = await this.prisma.nominations.findFirst({
      where: {
        is_male: isMale,
        OR: [{ name_ru: nameRu }, { name_en: nameEn }],
        ...(excludeId === undefined ? {} : { id: { not: excludeId } }),
      },
    });
    if (duplicate) {
      throw new BadRequestException('Nomination already exists');
    }
  }
}
