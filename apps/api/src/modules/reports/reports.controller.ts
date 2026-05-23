import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ActiveScope } from '../../auth/decorators/active-scope.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('kpis')
  async getKpis(@ActiveScope('warehouseId') warehouseId: string) {
    const warehouseItems = await this.prisma.warehouseItem.findMany({
      where: { warehouseId },
      select: {
        qtyOnHand: true,
        wac: true,
      },
    });

    const totalItems = warehouseItems.length;
    let totalValue = 0;
    let outOfStockCount = 0;

    for (const item of warehouseItems) {
      const qty = Number(item.qtyOnHand);
      const wac = Number(item.wac || 0);
      totalValue += qty * wac;
      if (qty === 0) {
        outOfStockCount++;
      }
    }

    const activeLocks = await this.prisma.warehouseLock.count({
      where: {
        warehouseId,
        isActive: true,
      },
    });

    return {
      totalItems,
      totalValue,
      outOfStockCount,
      activeLocks,
    };
  }

  @Get('dashboard')
  async getDashboard(@ActiveScope('warehouseId') warehouseId: string) {
    const pendingPurchaseRequests = await this.prisma.purchaseRequest.count({
      where: {
        status: 'SUBMITTED',
        warehouseId,
      },
    });

    const openPurchaseOrders = await this.prisma.purchaseOrder.count({
      where: {
        status: 'APPROVED',
        purchaseRequest: {
          warehouseId,
        },
      },
    });

    const inTransitTransfers = await this.prisma.transfer.count({
      where: {
        status: 'IN_TRANSIT',
        OR: [
          { fromWarehouseId: warehouseId },
          { toWarehouseId: warehouseId },
        ],
      },
    });

    const overdueTransfersList = await this.getOverdueTransfersList(warehouseId);

    return {
      pendingPurchaseRequests,
      openPurchaseOrders,
      inTransitTransfers,
      overdueTransfers: overdueTransfersList.length,
    };
  }

  @Get('adjustments/summary')
  async getAdjustmentsSummary(@ActiveScope('warehouseId') warehouseId: string) {
    const groups = await this.prisma.adjustment.groupBy({
      by: ['status'],
      where: { warehouseId },
      _count: {
        status: true,
      },
    });

    return groups.map((g) => ({
      status: g.status,
      count: g._count.status,
    }));
  }

  @Get('transfers/overdue')
  async getOverdueTransfers(@ActiveScope('warehouseId') warehouseId: string) {
    return this.getOverdueTransfersList(warehouseId);
  }

  private async getOverdueTransfersList(warehouseId: string) {
    const transfers = await this.prisma.transfer.findMany({
      where: {
        status: 'IN_TRANSIT',
        OR: [
          { fromWarehouseId: warehouseId },
          { toWarehouseId: warehouseId },
        ],
      },
      include: {
        fromWarehouse: true,
        toWarehouse: true,
      },
    });

    const overdueTransfers: any[] = [];
    const now = new Date();
    const overdueDays = Number(process.env.TRANSFER_OVERDUE_DAYS || 7);

    for (const transfer of transfers) {
      const shipEvent = await this.prisma.approvalEvent.findFirst({
        where: {
          documentId: transfer.id,
          toStatus: 'IN_TRANSIT',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const shippedAt = shipEvent ? shipEvent.createdAt : transfer.createdAt;
      const diffTime = now.getTime() - shippedAt.getTime();
      const daysInTransit = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (daysInTransit > overdueDays) {
        overdueTransfers.push({
          transferId: transfer.id,
          transferNumber: transfer.transferNumber,
          sourceWarehouseName: transfer.fromWarehouse.name,
          destinationWarehouseName: transfer.toWarehouse.name,
          shippedAt,
          daysInTransit,
        });
      }
    }

    return overdueTransfers;
  }
}
