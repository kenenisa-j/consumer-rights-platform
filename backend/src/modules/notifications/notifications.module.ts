import { Module } from '@nestjs/common';
import { PrismaModule } from '../../lib/database/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SmsNotificationAdapter } from './adapters/sms-notification.adapter';
import { EmailNotificationAdapter } from './adapters/email-notification.adapter';
import { PushNotificationAdapter } from './adapters/push-notification.adapter';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    SmsNotificationAdapter,
    EmailNotificationAdapter,
    PushNotificationAdapter,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}

