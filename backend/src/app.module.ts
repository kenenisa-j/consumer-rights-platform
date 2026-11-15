import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppConfigModule } from './lib/config/config.module';
import { PrismaModule } from './lib/database/prisma.module';
import { StorageModule } from './lib/storage/storage.module';
import { AuthModule } from './lib/auth/auth.module';
import { HealthModule } from './lib/health/health.module';
import { CasesModule } from './modules/cases/cases.module';
import { MeModule } from './modules/me/me.module';
import { OfficesModule } from './modules/offices/offices.module';
import { StaffModule } from './modules/staff/staff.module';
import { RolesPermissionsModule } from './modules/roles-permissions/roles-permissions.module';
import { MarketsModule } from './modules/markets/markets.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SlaModule } from './modules/sla/sla.module';
import { ReportsModule } from './modules/reports/reports.module';
import { PermissionGuard } from './lib/common/guards/permission.guard';
import { AllExceptionsFilter } from './lib/common/filters/all-exceptions.filter';
import { TransformInterceptor } from './lib/common/interceptors/transform.interceptor';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    StorageModule,
    AuthModule,
    HealthModule,
    CasesModule,
    MeModule,
    OfficesModule,
    StaffModule,
    RolesPermissionsModule,
    MarketsModule,
    MerchantsModule,
    CategoriesModule,
    NotificationsModule,
    SlaModule,
    ReportsModule,
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
