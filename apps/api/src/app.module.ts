import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ScopeInterceptor } from './auth/interceptors/scope.interceptor';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { PurchaseRequestsModule } from './modules/purchase-requests/purchase-requests.module';
import { WarehouseLockModule } from './modules/warehouse-lock/warehouse-lock.module';
import { IdempotencyService } from './services/idempotency.service';
import { IdempotencyGuard } from './guards/idempotency.guard';
import { WarehouseLockGuard } from './guards/warehouse-lock.guard';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    WorkflowModule,
    PurchaseRequestsModule,
    WarehouseLockModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    IdempotencyService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: IdempotencyGuard,
    },
    {
      provide: APP_GUARD,
      useClass: WarehouseLockGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ScopeInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class AppModule {}
