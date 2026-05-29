import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, register } from 'prom-client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MetricsService {
  public readonly postingOperationsCounter: Counter<string>;
  public readonly activeWarehouseLocksGauge: Gauge<string>;
  public readonly reconciliationDiscrepanciesCounter: Counter<string>;
  public readonly failedOutboxEventsCounter: Counter<string>;
  public readonly reconciliationDurationHistogram: Histogram<string>;
  public readonly outboxPendingGauge: Gauge<string>;

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

    this.reconciliationDurationHistogram =
      (register.getSingleMetric(
        'logirest_reconciliation_duration_ms',
      ) as Histogram<string>) ||
      new Histogram({
        name: 'logirest_reconciliation_duration_ms',
        help: 'Duration of daily reconciliation job in milliseconds',
        buckets: [1000, 5000, 10000, 30000, 60000, 120000, 300000],
      });

    this.outboxPendingGauge =
      (register.getSingleMetric(
        'logirest_outbox_pending_total',
      ) as Gauge<string>) ||
      new Gauge({
        name: 'logirest_outbox_pending_total',
        help: 'Number of pending outbox events waiting to be processed',
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

    // Dynamically update pending outbox gauge
    const pendingCount = await this.prisma.outboxEvent.count({
      where: { status: 'PENDING' },
    });
    this.outboxPendingGauge.set(pendingCount);

    return register.metrics();
  }
}
