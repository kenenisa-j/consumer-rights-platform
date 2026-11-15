import { Module } from '@nestjs/common';
import { PrismaModule } from '../../lib/database/prisma.module';
import { ReportsService } from './reports.service';
import {
  GovernmentReportsController,
  BusinessReportsController,
} from './reports.controller';

@Module({
  imports: [PrismaModule],
  controllers: [GovernmentReportsController, BusinessReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

