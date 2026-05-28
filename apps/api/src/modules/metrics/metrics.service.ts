import { Injectable } from '@nestjs/common';
import { Counter, Gauge, register } from 'prom-client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MetricsService {
  public readonly postingOperationsCounter: Counter<string>;
  public readonly activeWarehouseLocksGauge: Gauge<string>;
  public readonly reconciliationDiscrepanciesCounter: Counter<string>;
  public readonly failedOutboxEventsCounter: Counter<string>;

  constructor(private readonly prisma: PrismaService) {
    this.postingOperationsCounter =
      (register.getSingleMetric(
        'logirest_posting_operations_total',
      ) as Counter<string>) ||
      new Counter({
        name: 'logirest_posting_operations_total',
        help: 'Total number of posting operations',
        labelNames: ['document_type'],
      });

    this.activeWarehouseLocksGauge =
      (register.getSingleMetric(
        'logirest_warehouse_locks_active',
      ) as Gauge<string>) ||
      new Gauge({
        name: 'logirest_warehouse_locks_active',
        help: 'Number of active warehouse locks',
      });

    this.reconciliationDiscrepanciesCounter =
      (register.getSingleMetric(
        'logirest_reconciliation_discrepancies_total',
      ) as Counter<string>) ||
      new Counter({
        name: 'logirest_reconciliation_discrepancies_total',
        help: 'Total number of reconciliation discrepancies found',
      });

    this.failedOutboxEventsCounter =
      (register.getSingleMetric(
        'logirest_outbox_events_failed_total',
      ) as Counter<string>) ||
      new Counter({
        name: 'logirest_outbox_events_failed_total',
        help: 'Total number of failed outbox events',
      });
  }

  async getMetrics(): Promise<string> {
    // Dynamically update active warehouse locks gauge
    const activeLocks = await this.prisma.warehouseLock.count({
      where: {
        status: 'ACTIVE',
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
    this.activeWarehouseLocksGauge.set(activeLocks);

    return register.metrics();
  }
}
