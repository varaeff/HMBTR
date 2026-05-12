import { Module } from '@nestjs/common';
import { GroupCompetitorsService } from './group-competitors.service';
import { GroupCompetitorsController } from './group-competitors.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GroupCompetitorsController],
  providers: [GroupCompetitorsService],
  exports: [GroupCompetitorsService],
})
export class GroupCompetitorsModule {}
