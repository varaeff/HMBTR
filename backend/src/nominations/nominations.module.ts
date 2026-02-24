import { Module } from '@nestjs/common';
import { NominationsController } from './nominations.controller';
import { NominationsService } from './nominations.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NominationsController],
  providers: [NominationsService],
})
export class NominationsModule {}
