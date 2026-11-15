import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppConfigModule } from './lib/config/config.module';
import { PrismaModule } from './lib/database/prisma.module';
import { AuthModule } from './lib/auth/auth.module';
import { HealthModule } from './lib/health/health.module';
import { MeModule } from './modules/me/me.module';
import { ReferenceModule } from './modules/reference/reference.module';
import { ContentModule } from './modules/content/content.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { TipsModule } from './modules/tips/tips.module';
import { MessagesModule } from './modules/messages/messages.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { PermissionGuard } from './lib/common/guards/permission.guard';
import { AllExceptionsFilter } from './lib/common/filters/all-exceptions.filter';
import { TransformInterceptor } from './lib/common/interceptors/transform.interceptor';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AuthModule,
    HealthModule,
    MeModule,
    ReferenceModule,
    ContentModule,
    ComplaintsModule,
    TipsModule,
    MessagesModule,
    EvidenceModule,
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
