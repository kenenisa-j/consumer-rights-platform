import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannelAdapter, NotificationPayload } from './notification-channel.interface';

@Injectable()
export class EmailNotificationAdapter implements NotificationChannelAdapter {
  readonly channelName = 'EMAIL';
  private readonly logger = new Logger(EmailNotificationAdapter.name);

  async send(payload: NotificationPayload): Promise<void> {
    if (!payload.recipientEmail) return;
    const maskedEmail = this.maskEmail(payload.recipientEmail);
    this.logger.debug(
      `[EMAIL-ADAPTER] Email notification queued for ${maskedEmail} (type: ${payload.type})`,
    );
  }

  private maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    if (!domain) return '****';
    const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : '***';
    return `${maskedName}@${domain}`;
  }
}

