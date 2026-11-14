import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider } from './sms.interface';

/**
 * Mock SMS Provider for local development and automated testing.
 *
 * In development and test environments, records OTP dispatches in an in-memory
 * ring-buffer for automated verification without sending real SMS messages.
 * In production, logs safe dispatch metadata and masks the OTP code.
 */
@Injectable()
export class MockSmsService implements SmsProvider {
  private readonly logger = new Logger(MockSmsService.name);
  private readonly isProduction: boolean;
  private readonly dispatchedOtps = new Map<string, { code: string; sentAt: Date }>();

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    this.isProduction = nodeEnv === 'production';
  }

  async sendOtp(phoneNumber: string, code: string): Promise<void> {
    const maskedPhone = this.maskPhoneNumber(phoneNumber);

    if (this.isProduction) {
      this.logger.error(`[SMS-GATEWAY-MOCK] Refusing to dispatch: MockSmsService cannot be used in production. A production SmsProvider must be configured.`);
      throw new Error('SMS delivery failed: production SMS provider is not configured.');
    } else {
      this.logger.debug(`[SMS-GATEWAY-MOCK] Dispatched OTP [REDACTED] to ${maskedPhone}`);
      this.dispatchedOtps.set(phoneNumber, { code, sentAt: new Date() });
    }
  }

  /**
   * Test helper: Retrieves the most recently sent OTP for a given phone number.
   * Returns undefined in production or if no OTP was dispatched.
   */
  getLastOtpFor(phoneNumber: string): string | undefined {
    if (this.isProduction) {
      return undefined;
    }
    return this.dispatchedOtps.get(phoneNumber)?.code;
  }

  /**
   * Test helper: Clears dispatched OTP history.
   */
  clearHistory(): void {
    this.dispatchedOtps.clear();
  }

  maskPhoneNumber(phone: string): string {
    if (phone.length <= 4) {
      return '****';
    }
    return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
  }
}
