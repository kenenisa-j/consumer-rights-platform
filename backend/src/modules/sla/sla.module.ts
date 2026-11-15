import { Module } from '@nestjs/common';
import { PrismaModule } from '../../lib/database/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SlaService } from './sla.service';
import {
  GovernmentSlaController,
  BusinessSlaController,
} from './sla.controller';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [GovernmentSlaController, BusinessSlaController],
  providers: [SlaService],
  exports: [SlaService],
})
export class SlaModule {}

