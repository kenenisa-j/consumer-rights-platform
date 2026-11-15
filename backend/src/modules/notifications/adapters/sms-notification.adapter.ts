import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { NotificationChannelAdapter, NotificationPayload } from './notification-channel.interface';
import { SMS_PROVIDER, SmsProvider } from '../../../lib/auth/sms/sms.interface';

@Injectable()
export class SmsNotificationAdapter implements NotificationChannelAdapter {
  readonly channelName = 'SMS';
  private readonly logger = new Logger(SmsNotificationAdapter.name);

  constructor(
    @Optional() @Inject(SMS_PROVIDER) private readonly smsProvider?: SmsProvider,
  ) {}

  async send(payload: NotificationPayload): Promise<void> {
    if (!payload.recipientPhone) {
      return;
    }

    const maskedPhone = this.maskPhoneNumber(payload.recipientPhone);
    this.logger.debug(
      `[SMS-ADAPTER] Transactional notification '${payload.type}' dispatched to ${maskedPhone} for case ${payload.caseId ?? 'N/A'}`,
    );

    // When real SMS provider is integrated for non-OTP alerts, it dispatches here.
    // Notice: mock provider in auth is OTP-specific; transactional SMS provider hook is ready here.
  }

  private maskPhoneNumber(phone: string): string {
    if (phone.length <= 4) return '****';
    return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
  }
}

