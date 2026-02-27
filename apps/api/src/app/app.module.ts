import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TenantModule } from '../tenant/tenant.module';
import { HealthModule } from '../health/health.module';
import { PatientsModule } from '../patients/patients.module';
import { SessionsModule } from '../sessions/sessions.module';
import { CrmModule } from '../crm/crm.module';
import { InventoryModule } from '../inventory/inventory.module';
import { BillingModule } from '../billing/billing.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { StaffModule } from '../staff/staff.module';
import { PhotosModule } from '../photos/photos.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../tenant/guards/tenant.guard';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.local'] }),
    PrismaModule,
    AuthModule,
    TenantModule,
    HealthModule,
    PatientsModule,
    SessionsModule,
    CrmModule,
    InventoryModule,
    BillingModule,
    AppointmentsModule,
    AnalyticsModule,
    StaffModule,
    PhotosModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule { }
