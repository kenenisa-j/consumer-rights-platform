import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { phoneNumber } from 'better-auth/plugins';
import { APIError } from 'better-auth/api';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { SmsProvider } from './sms/sms.interface';

/**
 * Builds the Better Auth instance for the Addis Ababa Consumer Rights Portal.
 *
 * Enforces:
 * - Phone-first citizen authentication via Phone Number plugin.
 * - Inferred API types exposing consumePhoneNumberOTP and signInPhoneNumber.
 * - Non-nullable phone-number constraint with removal rejection hook.
 * - HTTP-only session cookies with secure defaults.
 * - Field hiding for sensitive attributes (Fayda, status, password hashes).
 */
export function createBetterAuth(
  prisma: PrismaService,
  smsProvider: SmsProvider,
  configService: ConfigService,
) {
  const publicUrl = configService.get<string>('PUBLIC_URL', 'http://localhost:3300');
  const secret =
    configService.get<string>('BETTER_AUTH_SECRET') ||
    'development-better-auth-secret-key-must-be-at-least-32-chars-long';

  return betterAuth({
    baseURL: `${publicUrl}/api/auth`,
    basePath: '/api/auth',
    secret,
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
      cookieCache: {
        enabled: false,
      },
    },
    user: {
      fields: {
        name: 'fullName',
      },
      additionalFields: {
        status: {
          type: 'string',
          defaultValue: 'ACTIVE',
          input: false,
          returned: false,
        },
        nationalIdFayda: {
          type: 'string',
          required: false,
          input: false,
          returned: false,
        },
        preferredLanguage: {
          type: 'string',
          defaultValue: 'am',
          input: true,
          returned: true,
        },
      },
    },
    databaseHooks: {
      user: {
        update: {
          before: async (data) => {
            if (data.phoneNumber === null || data.phoneNumber === '') {
              throw new APIError('BAD_REQUEST', {
                message: 'A verified phone number is mandatory and cannot be removed.',
              });
            }
            return { data };
          },
        },
      },
    },
    rateLimit: {
      enabled: configService.get<string>('NODE_ENV') !== 'test',
      customRules: {
        '/phone-number/send-otp': {
          window: 60,
          max: 3,
        },
      },
    },
    plugins: [
      phoneNumber({
        otpLength: 6,
        expiresIn: 300, // 5 minutes
        allowedAttempts: 3,
        phoneNumberValidator: (phone: string) => /^\+[1-9]\d{1,14}$/.test(phone),
        sendOTP: async ({ phoneNumber: targetPhone, code }) => {
          await smsProvider.sendOtp(targetPhone, code);
        },
      }),
    ],
  });
}

export type AuthInstance = ReturnType<typeof createBetterAuth>;
