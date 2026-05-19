import { Module } from '@nestjs/common';
import { CompetitorsController } from './competitors.controller';
import { CompetitorsService } from './competitors.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DisciplinaryCardsModule } from '../disciplinary-cards/disciplinary-cards.module';

@Module({
  imports: [PrismaModule, DisciplinaryCardsModule],
  controllers: [CompetitorsController],
  providers: [CompetitorsService],
})
export class CompetitorsModule {}
