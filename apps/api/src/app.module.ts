import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    IdempotencyService,
    LockCleanupJob,
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
