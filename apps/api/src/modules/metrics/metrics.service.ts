import { Injectable } from '@nestjs/common';
import { Registry, Counter, Gauge } from 'prom-client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MetricsService {
  private readonly registry: Registry;
  public readonly postingOperationsCounter: Counter<string>;
  public readonly activeWarehouseLocksGauge: Gauge<string>;
  public readonly reconciliationDiscrepanciesCounter: Counter<string>;
  public readonly failedOutboxEventsCounter: Counter<string>;

  constructor(private readonly prisma: PrismaService) {
    this.registry = new Registry();

    this.postingOperationsCounter = new Counter({
      name: 'logirest_posting_operations_total',
      help: 'Total number of posting operations',
      labelNames: ['document_type'],
      registers: [this.registry],
    });

    this.activeWarehouseLocksGauge = new Gauge({
      name: 'logirest_warehouse_locks_active',
      help: 'Number of active warehouse locks',
      registers: [this.registry],
    });

    this.reconciliationDiscrepanciesCounter = new Counter({
      name: 'logirest_reconciliation_discrepancies_total',
      help: 'Total number of reconciliation discrepancies found',
      registers: [this.registry],
    });

    this.failedOutboxEventsCounter = new Counter({
      name: 'logirest_outbox_events_failed_total',
      help: 'Total number of failed outbox events',
      registers: [this.registry],
    });
  }

  async getMetrics(): Promise<string> {
    // Dynamically update active warehouse locks gauge
    const activeLocks = await this.prisma.warehouseLock.count({
      where: { status: 'ACTIVE', isActive: true, expiresAt: { gt: new Date() } },
    });
    this.activeWarehouseLocksGauge.set(activeLocks);

    return this.registry.metrics();
  }
}
