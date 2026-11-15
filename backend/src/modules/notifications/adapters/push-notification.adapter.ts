import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannelAdapter, NotificationPayload } from './notification-channel.interface';

@Injectable()
export class PushNotificationAdapter implements NotificationChannelAdapter {
  readonly channelName = 'PUSH';
  private readonly logger = new Logger(PushNotificationAdapter.name);

  async send(payload: NotificationPayload): Promise<void> {
    this.logger.debug(
      `[PUSH-ADAPTER] Web push notification registered for user ${payload.recipientUserId} (type: ${payload.type})`,
    );
  }
}

