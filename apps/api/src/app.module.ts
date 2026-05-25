import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { validate } from './config/env.validation';
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
import { LedgerModule } from './modules/ledger/ledger.module';
import { PurchasingModule } from './modules/purchasing/purchasing.module';
import { OperationsModule } from './modules/operations/operations.module';
import { StocktakeModule } from './modules/stocktake/stocktake.module';
import { KitchenRequestsModule } from './modules/kitchen-requests/kitchen-requests.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { AdminModule } from './modules/admin/admin.module';
import { DocumentSequenceModule } from './modules/sequencing/document-sequence.module';
import { IdempotencyService } from './services/idempotency.service';
import { IdempotencyGuard } from './guards/idempotency.guard';
import { WarehouseLockGuard } from './guards/warehouse-lock.guard';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor';
import { LockCleanupJob } from './jobs/lock-cleanup.job';
import { LowStockAlertJob } from './jobs/low-stock-alert.job';
import { NotificationCleanupJob } from './jobs/notification-cleanup.job';
import { IdempotencyCleanupJob } from './jobs/idempotency-cleanup.job';
import { TokenCleanupJob } from './jobs/token-cleanup.job';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxModule } from './modules/outbox/outbox.module';
import { RedisModule } from './redis/redis.module';
import { LoggerModule } from 'nestjs-pino';
import * as crypto from 'crypto';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req, res) => {
          const rawCorrelationId =
            req.headers['x-correlation-id'] || req.headers['x-request-id'];
          const correlationId = Array.isArray(rawCorrelationId)
            ? rawCorrelationId[0]
            : (rawCorrelationId as string) || crypto.randomUUID();
          res.setHeader('x-correlation-id', correlationId);
          return correlationId;
        },
        customProps: (req, res) => ({
          correlationId: res.getHeader('x-correlation-id'),
        }),
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      },
    }),
    // General API rate limit: 100 requests per 60 seconds per IP (applied globally)
    // Auth/login routes override to 10/60s via @Throttle() decorator
    ThrottlerModule.forRoot([{ name: 'short', ttl: 60000, limit: 100 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    WorkflowModule,
    PurchaseRequestsModule,
    WarehouseLockModule,
    LedgerModule,
    PurchasingModule,
    OperationsModule,
    StocktakeModule,
    KitchenRequestsModule,
    MasterDataModule,
    InventoryModule,
    ReportsModule,
    NotificationModule,
    AdminModule,
    DocumentSequenceModule,
    OutboxModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    IdempotencyService,
    LockCleanupJob,
    LowStockAlertJob,
    NotificationCleanupJob,
    IdempotencyCleanupJob,
    TokenCleanupJob,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
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
