import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppConfigModule } from './lib/config/config.module';
import { PrismaModule } from './lib/database/prisma.module';
import { AuthModule } from './lib/auth/auth.module';
import { HealthModule } from './lib/health/health.module';
import { CasesModule } from './modules/cases/cases.module';
import { MeModule } from './modules/me/me.module';
import { PermissionGuard } from './lib/common/guards/permission.guard';
import { AllExceptionsFilter } from './lib/common/filters/all-exceptions.filter';
import { TransformInterceptor } from './lib/common/interceptors/transform.interceptor';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AuthModule,
    HealthModule,
    CasesModule,
    MeModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule { }
