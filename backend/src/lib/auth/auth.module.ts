import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { AppConfigModule } from '../config/config.module';
import { AuthService } from './auth.service';
import { SMS_PROVIDER } from './sms/sms.interface';
import { MockSmsService } from './sms/mock-sms.service';
import { AuthRegistrationController } from './controllers/auth-registration.controller';
import { RegistrationRateLimitGuard } from '../common/guards/registration-rate-limit.guard';

/**
 * Authentication Module
 *
 * Configures Better Auth, SMS provider integrations, and custom registration endpoints.
 */
@Global()
@Module({
  imports: [PrismaModule, AppConfigModule],
  controllers: [AuthRegistrationController],
  providers: [
    MockSmsService,
    {
      provide: SMS_PROVIDER,
      useExisting: MockSmsService,
    },
    AuthService,
    RegistrationRateLimitGuard,
  ],
  exports: [AuthService, SMS_PROVIDER, MockSmsService, RegistrationRateLimitGuard],
})
export class AuthModule { }
