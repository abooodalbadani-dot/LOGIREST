import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ApiSecureController } from '../../decorators/swagger-docs.decorator';

@Controller('dashboard')
@ApiSecureController()
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  async getStats(@Query('role') role?: string) {
    const [
      warehouseItems,
      pendingPrs,
      activeStocktakes,
      lowStockCount,
      activeUserCount,
      nearExpiryCount,
      activePOs,
      pendingGRNs,
      recentIssues,
      recentTransfers,
      activityLedger,
      expiringLots,
      pendingApprovals,
    ] = await Promise.all([
      // Total inventory value (sum of WAC * qtyOnHand)
      this.prisma.warehouseItem.findMany({
        select: { qtyOnHand: true, wac: true },
      }),
      // Pending purchase requests
      this.prisma.purchaseRequest.count({
        where: { status: 'PENDING_APPROVAL' },
      }),
      // Active stocktakes
      this.prisma.stocktakeSession.count({
        where: { status: { in: ['STARTED', 'COUNTING', 'REVIEW'] } },
      }),
      // Low stock items (qtyOnHand = 0)
      this.prisma.warehouseItem.count({
        where: { qtyOnHand: { lte: 0 } },
      }),
      // Active users
      this.prisma.user.count({ where: { isActive: true } }),
      // Near-expiry lots (within 30 days)
      this.prisma.lot.count({
        where: {
          expiryDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
          status: 'ACTIVE',
        },
      }),
      // Active purchase orders
      this.prisma.purchaseOrder.count({
        where: { status: { in: ['DRAFT', 'APPROVED', 'PARTIALLY_RECEIVED'] } },
      }),
      // Pending GRNs
      this.prisma.goodsReceivedNote.count({ where: { status: 'DRAFT' } }),
      // Recent issues
      this.prisma.inventoryIssue.findMany({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          issueNumber: true,
          status: true,
          createdAt: true,
          department: { select: { name: true } },
        },
      }),
      // Recent transfers
      this.prisma.transfer.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          transferNumber: true,
          status: true,
          createdAt: true,
          toWarehouse: { select: { name: true } },
        },
      }),
      // Activity ledger (last 10 stock movements)
      this.prisma.stockLedger.findMany({
        orderBy: { postedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          quantity: true,
          documentType: true,
          postedAt: true,
          item: {
            select: { name: true, unitOfMeasure: { select: { code: true } } },
          },
        },
      }),
      // Expiring lots (next 30 days)
      this.prisma.lot.findMany({
        where: {
          expiryDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
          status: 'ACTIVE',
        },
        orderBy: { expiryDate: 'asc' },
        take: 10,
        select: {
          id: true,
          lotNumber: true,
          expiryDate: true,
          item: {
            select: { name: true, unitOfMeasure: { select: { code: true } } },
          },
          warehouseItemLots: {
            select: {
              qtyOnHand: true,
              warehouse: { select: { name: true } },
            },
            take: 1,
          },
        },
      }),
      // Pending approvals
      this.prisma.purchaseRequest.findMany({
        where: { status: 'PENDING_APPROVAL' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          requestNumber: true,
          status: true,
          createdAt: true,
          warehouse: { select: { name: true } },
        },
      }),
    ]);

    // Calculate total inventory value
    const totalValue = warehouseItems.reduce(
      (sum, item) => sum + Number(item.qtyOnHand) * Number(item.wac),
      0,
    );

    // Build recent_requests from issues + transfers combined
    const recentRequests = [
      ...recentIssues.map((i) => ({
        id: i.id,
        document_number: i.issueNumber,
        type: 'ISSUE' as const,
        status: i.status,
        priority: 'NORMAL',
        items_summary: '',
        created_at: i.createdAt.toISOString(),
        destination: i.department?.name ?? '',
      })),
      ...recentTransfers.map((t) => ({
        id: t.id,
        document_number: t.transferNumber,
        type: 'TRANSFER' as const,
        status: t.status,
        priority: 'NORMAL',
        items_summary: '',
        created_at: t.createdAt.toISOString(),
        destination: t.toWarehouse?.name ?? '',
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 5);

    const activityLog = activityLedger.map((l) => ({
      id: l.id,
      item_name: l.item.name,
      qty: Number(l.quantity),
      uom: l.item.unitOfMeasure?.code ?? '',
      time: l.postedAt.toISOString(),
      type: l.documentType,
    }));

    const now = Date.now();
    const expiringLotsFormatted = expiringLots.map((lot) => {
      const msLeft = (lot.expiryDate?.getTime() ?? now) - now;
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      const wil = lot.warehouseItemLots[0];
      return {
        id: lot.id,
        item_name: lot.item.name,
        lot_number: lot.lotNumber,
        expiry_date: lot.expiryDate?.toISOString() ?? '',
        days_left: daysLeft,
        warehouse_name: wil?.warehouse?.name ?? '',
        qty: Number(wil?.qtyOnHand ?? 0),
        uom: lot.item.unitOfMeasure?.code ?? '',
      };
    });

    const pendingApprovalsFormatted = pendingApprovals.map((pr) => ({
      id: pr.id,
      document_number: pr.requestNumber,
      type: 'PR' as const,
      status: pr.status,
      priority: 'NORMAL',
      destination: pr.warehouse?.name ?? '',
      created_at: pr.createdAt.toISOString(),
    }));

    return {
      total_value: totalValue,
      pending_fulfillment: 0,
      shortages: lowStockCount,
      warehouse_capacity: 0,
      pending_prs: pendingPrs,
      active_stocktakes: activeStocktakes,
      low_stock_items: lowStockCount,
      system_health: 100,
      active_users: activeUserCount,
      near_expiry_count: nearExpiryCount,
      today_consumption: 0,
      stock_health: 100,
      active_pos: activePOs,
      pending_grns: pendingGRNs,
      total_procurement_spend: 0,
      recent_requests: recentRequests,
      activity_log: activityLog,
      expiring_lots: expiringLotsFormatted,
      fulfillment_queue: [],
      pending_approvals: pendingApprovalsFormatted,
      top_vendors: [],
      efficiency_metrics: {
        po_conversion_rate: 0,
        fulfillment_cycle_days: 0,
        throughput_week: 0,
        conversion_chart: [],
        velocity_chart: [],
      },
      system_audit_logs: [],
    };
  }
}
