import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpStatus,
  HttpCode,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { RoleCode } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { RegistrationRateLimitGuard } from '../../common/guards/registration-rate-limit.guard';
import { AuthService } from '../auth.service';
import { RegisterConsumerDto } from '../dto/register-consumer.dto';

/**
 * Controller handling atomic citizen registration and initial session issuance.
 */
@Controller('auth')
export class AuthRegistrationController {
  private readonly logger = new Logger(AuthRegistrationController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) { }

  @Public()
  @UseGuards(RegistrationRateLimitGuard)
  @Post('register-consumer')
  @HttpCode(HttpStatus.CREATED)
  async registerConsumer(
    @Body() dto: RegisterConsumerDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // 1. Consume and verify OTP using Better Auth server-side API
    try {
      const otpResult = await this.authService.auth.api.consumePhoneNumberOTP({
        body: {
          phoneNumber: dto.phoneNumber,
          code: dto.otp,
        },
      });

      if (!otpResult || (typeof otpResult === 'object' && 'status' in otpResult && !otpResult.status)) {
        throw new BadRequestException({
          code: 'INVALID_OTP',
          message: 'The verification code provided is invalid or has expired.',
        });
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.warn(`OTP verification rejected for ${dto.phoneNumber}: ${String(error)}`);
      throw new BadRequestException({
        code: 'INVALID_OTP',
        message: 'The verification code provided is invalid or has expired.',
      });
    }

    // 2. Hash password with Better Auth's cryptographic hasher (scrypt)
    const passwordHash = await this.authService.hashPassword(dto.password);

    // 3. Execute atomic registration within a Prisma transaction
    let createdUser;
    try {
      createdUser = await this.prisma.$transaction(async (tx) => {
        // Enforce server-controlled CONSUMER role
        const consumerRole = await tx.role.findUnique({
          where: { code: RoleCode.CONSUMER },
        });

        if (!consumerRole) {
          throw new Error('CONSUMER_ROLE_NOT_CONFIGURED');
        }

        // Create User with verified phone number and synthetic email bridge
        const tempEmail = `${dto.phoneNumber.replace(/\+/g, '')}@consumer.local`;
        const user = await tx.user.create({
          data: {
            phoneNumber: dto.phoneNumber,
            phoneNumberVerified: true,
            fullName: dto.fullName,
            email: tempEmail,
            emailVerified: false,
            passwordHash,
            status: 'ACTIVE',
            preferredLanguage: dto.preferredLanguage || 'am',
          },
        });

        // Create credential Account record
        await tx.account.create({
          data: {
            accountId: user.id,
            providerId: 'credential',
            userId: user.id,
            password: passwordHash,
          },
        });

        // Atomically bind CONSUMER role
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: consumerRole.id,
          },
        });

        return user;
      });
    } catch (error) {
      this.logger.error(`Registration transaction failed for ${dto.phoneNumber}: ${String(error)}`);
      // Since OTP was already consumed, client must request a new OTP to avoid replay
      throw new BadRequestException({
        code: 'REGISTRATION_TRANSACTION_FAILED',
        message: 'The verification code was consumed but account registration failed. Please request a new code.',
      });
    }

    // 4. Establish authenticated session via Better Auth phone/password API
    try {
      const authRes = await this.authService.auth.api.signInPhoneNumber({
        body: {
          phoneNumber: dto.phoneNumber,
          password: dto.password,
        },
        headers: fromNodeHeaders(req.headers),
        asResponse: true,
      });

      // Forward genuine Better Auth Set-Cookie headers to browser
      const cookies =
        typeof authRes.headers.getSetCookie === 'function'
          ? authRes.headers.getSetCookie()
          : [authRes.headers.get('set-cookie')].filter(Boolean) as string[];

      if (cookies.length > 0) {
        res.setHeader('Set-Cookie', cookies);
      }

      const responseBody = await authRes.json();

      return {
        success: true,
        user: {
          id: createdUser.id,
          phoneNumber: createdUser.phoneNumber,
          fullName: createdUser.fullName,
          preferredLanguage: createdUser.preferredLanguage,
        },
        session: responseBody.session,
      };
    } catch (error) {
      this.logger.error(`Post-registration session establishment failed: ${String(error)}`);
      throw new InternalServerErrorException({
        code: 'SESSION_INITIALIZATION_FAILED',
        message: 'Account registered successfully, but automatic login failed. Please sign in.',
      });
    }
  }

  @RequirePermission('complaints:read:own')
  @Get('protected-test')
  async protectedTest(@Req() req: Request) {
    return {
      authenticated: true,
      user: (req as any).user,
    };
  }
}
