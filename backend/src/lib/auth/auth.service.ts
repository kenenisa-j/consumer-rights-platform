import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { SMS_PROVIDER, SmsProvider } from './sms/sms.interface';
import { createBetterAuth, AuthInstance } from './auth.config';

/**
 * AuthService integrates Better Auth into the NestJS lifecycle.
 *
 * Provides access to the Better Auth instance, server API methods,
 * and standard password hashing utilities.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  public readonly auth: AuthInstance;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SMS_PROVIDER) private readonly smsProvider: SmsProvider,
    private readonly configService: ConfigService,
  ) {
    this.auth = createBetterAuth(this.prisma, this.smsProvider, this.configService);
    this.logger.log('Better Auth initialized successfully with PostgreSQL Prisma adapter.');
  }

  /**
   * Hashes a plaintext password using Better Auth's configured cryptographic hasher (scrypt).
   */
  async hashPassword(password: string): Promise<string> {
    const ctx = await this.auth.$context;
    return ctx.password.hash(password);
  }
}
