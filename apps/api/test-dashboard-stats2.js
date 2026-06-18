const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const CURRENCY_SYMBOLS = {
      SAR: '\uFDFC',
      USD: '$',
      EUR: '\u20AC',
      GBP: '\u00A3',
      AED: '\u062F.\u0625',
      QAR: '\u0631.\u0642',
      KWD: '\u062F.\u0643',
      BHD: '\u062F.\u0628',
      OMR: '\u0631.\u0639',
      EGP: '\u00A3',
      TRY: '\u20BA',
      PKR: '\u20A8',
      INR: '\u20B9',
      CNY: '\u00A5',
      JPY: '\u00A5',
      KRW: '\u20A9',
    };

    async function getBaseCurrencyConfig() {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'system_settings' },
      });
  
      let code;
      if (setting?.value) {
        try {
          const parsed = JSON.parse(setting.value);
          if (typeof parsed.baseCurrency === 'string') {
            code = parsed.baseCurrency;
          } else if (typeof parsed.base_currency === 'string') {
            code = parsed.base_currency;
          }
        } catch {}
      }
  
      const currency = code || process.env.BASE_CURRENCY_CODE || 'USD';
      const currencySymbol = CURRENCY_SYMBOLS[currency] ?? currency;
  
      return { currency, currencySymbol };
    }

    const { currency, currencySymbol } = await getBaseCurrencyConfig();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

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
      // Dynamic aggregations:
      pendingFulfillmentCount,
      totalWarehouseItems,
      stockedWarehouseItems,
      deadLetteredCount,
      todayIssues,
      globalGrnLines,
      suppliers,
      totalPrsCount,
      convertedPrsCount,
      fulfilledRequests,
      ledgerAggregation,
      auditLogsList,
    ] = await Promise.all([
      // Total inventory value (sum of WAC * qtyOnHand)
      prisma.warehouseItem.findMany({
        select: { qtyOnHand: true, wac: true },
      }),
      // Pending purchase requests
      prisma.purchaseRequest.count({
        where: { status: 'PENDING_APPROVAL' },
      }),
      // Active stocktakes
      prisma.stocktakeSession.count({
        where: { status: { in: ['STARTED', 'COUNTING', 'REVIEW'] } },
      }),
      // Low stock items (qtyOnHand = 0)
      prisma.warehouseItem.count({
        where: { qtyOnHand: { lte: 0 } },
      }),
      // Active users
      prisma.user.count({ where: { isActive: true } }),
      // Near-expiry lots (within 30 days)
      prisma.lot.count({
        where: {
          expiryDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
          status: 'ACTIVE',
        },
      }),
      // Active purchase orders
      prisma.purchaseOrder.count({
        where: { status: { in: ['DRAFT', 'APPROVED', 'PARTIALLY_RECEIVED'] } },
      }),
      // Pending GRNs
      prisma.goodsReceivedNote.count({ where: { status: 'DRAFT' } }),
      // Recent issues
      prisma.inventoryIssue.findMany({
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
      prisma.transfer.findMany({
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
      prisma.stockLedger.findMany({
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
      prisma.lot.findMany({
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
          itemId: true,
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
      prisma.purchaseRequest.findMany({
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
      // 1. Pending fulfillment
      prisma.kitchenRequest.count({
        where: { status: { in: ['DRAFT', 'SUBMITTED'] } },
      }),
      // 2. Total warehouse items count
      prisma.warehouseItem.count(),
      // 3. Stocked warehouse items count
      prisma.warehouseItem.count({
        where: { qtyOnHand: { gt: 0 } },
      }),
      // 4. Dead lettered outbox events
      prisma.outboxEvent.count({
        where: { deadLettered: true },
      }),
      // 5. Today's posted inventory issues
      prisma.inventoryIssue.findMany({
        where: {
          status: 'POSTED',
          createdAt: { gte: startOfToday },
        },
        include: {
          lines: { select: { quantity: true } },
        },
      }),
      // 6. Posted GRN Lines for total procurement spend
      prisma.gRNLine.findMany({
        where: {
          goodsReceivedNote: { status: 'POSTED' },
        },
        select: {
          quantityReceived: true,
          unitPrice: true,
        },
      }),
      // 7. Suppliers for Top Vendors
      prisma.supplier.findMany({
        where: { isActive: true },
        include: {
          purchaseOrders: {
            include: {
              goodsReceivedNotes: {
                where: { status: 'POSTED' },
                include: {
                  lines: {
                    select: {
                      quantityReceived: true,
                      unitPrice: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      // 8. Total PRs Count
      prisma.purchaseRequest.count(),
      // 9. Converted POs Count
      prisma.purchaseOrder.count({
        where: { prId: { not: null } },
      }),
      // 10. Fulfilled Kitchen Requests
      prisma.kitchenRequest.findMany({
        where: {
          status: 'FULFILLED',
          issueId: { not: null },
        },
        include: {
          inventoryIssue: {
            select: { createdAt: true },
          },
        },
      }),
      // 11. Throughput StockLedger Sum
      prisma.stockLedger.aggregate({
        where: {
          postedAt: { gte: sevenDaysAgo },
          documentType: { in: ['INVENTORY_ISSUE', 'TRANSFER'] },
        },
        _sum: {
          quantity: true,
        },
      }),
      // 12. System audit logs
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: true },
      }),
    ]);

    // Calculate total inventory value
    const totalValue = warehouseItems.reduce(
      (sum, item) => sum + Number(item.qtyOnHand) * Number(item.wac),
      0,
    );

    // Build recentRequests from issues + transfers combined
    const recentRequests = [
      ...recentIssues.map((i) => ({
        id: i.id,
        documentNumber: i.issueNumber,
        type: 'ISSUE',
        status: i.status,
        priority: 'NORMAL',
        itemsSummary: '',
        createdAt: i.createdAt.toISOString(),
        destination: i.department?.name ?? '',
      })),
      ...recentTransfers.map((t) => ({
        id: t.id,
        documentNumber: t.transferNumber,
        type: 'TRANSFER',
        status: t.status,
        priority: 'NORMAL',
        itemsSummary: '',
        createdAt: t.createdAt.toISOString(),
        destination: t.toWarehouse?.name ?? '',
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);

    const activityLog = activityLedger.map((l) => ({
      id: l.id,
      itemName: l.item.name,
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
        itemId: lot.itemId,
        itemName: lot.item.name,
        lotNumber: lot.lotNumber,
        expiryDate: lot.expiryDate?.toISOString() ?? '',
        daysLeft,
        warehouseName: wil?.warehouse?.name ?? '',
        qty: Number(wil?.qtyOnHand ?? 0),
        uom: lot.item.unitOfMeasure?.code ?? '',
      };
    });

    const pendingApprovalsFormatted = pendingApprovals.map((pr) => ({
      id: pr.id,
      documentNumber: pr.requestNumber,
      type: 'PR',
      status: pr.status,
      priority: 'NORMAL',
      destination: pr.warehouse?.name ?? '',
      createdAt: pr.createdAt.toISOString(),
    }));

    // Calculate today consumption
    let todayConsumption = 0;
    for (const issue of todayIssues) {
      for (const line of issue.lines) {
        todayConsumption += Number(line.quantity);
      }
    }

    // Calculate warehouseCapacity
    const warehouseCapacity =
      totalWarehouseItems > 0
        ? Math.round((stockedWarehouseItems / totalWarehouseItems) * 100)
        : 0;

    // Calculate systemHealth
    const systemHealth = Math.max(0, 100 - deadLetteredCount * 10);

    // Calculate stockHealth
    const stockHealth =
      totalWarehouseItems > 0
        ? Math.round(
            ((totalWarehouseItems - lowStockCount) / totalWarehouseItems) * 100,
          )
        : 100;

    // Calculate total procurement spend
    const totalProcurementSpend = globalGrnLines.reduce(
      (sum, line) =>
        sum + Number(line.quantityReceived) * Number(line.unitPrice),
      0,
    );

    // Calculate top vendors
    const vendorSpendMap = suppliers.map((supplier) => {
      let totalSpend = 0;
      for (const po of supplier.purchaseOrders) {
        for (const grn of po.goodsReceivedNotes) {
          for (const line of grn.lines) {
            totalSpend +=
              Number(line.quantityReceived) * Number(line.unitPrice);
          }
        }
      }
      return {
        name: supplier.name,
        spend: totalSpend,
        status: supplier.isActive ? 'ACTIVE' : 'INACTIVE',
      };
    });

    const topVendors = vendorSpendMap
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);

    // Calculate efficiency metrics
    const poConversionRate =
      totalPrsCount > 0
        ? Math.round((convertedPrsCount / totalPrsCount) * 100)
        : 100;

    let totalDays = 0;
    let fulfilledCount = 0;
    for (const req of fulfilledRequests) {
      if (req.inventoryIssue) {
        const diffMs =
          req.inventoryIssue.createdAt.getTime() - req.createdAt.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        totalDays += diffDays;
        fulfilledCount++;
      }
    }
    const fulfillmentCycleDays =
      fulfilledCount > 0
        ? parseFloat((totalDays / fulfilledCount).toFixed(1))
        : 0;
    const throughputWeek = Math.abs(
      Number(ledgerAggregation._sum.quantity || 0),
    );

    // Parallelized query generation for monthly charts
    const chartPromises = [];
    for (let i = 5; i >= 0; i--) {
      const startOfMonth = new Date();
      startOfMonth.setMonth(startOfMonth.getMonth() - i);
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      chartPromises.push(
        Promise.all([
          prisma.purchaseRequest.count({
            where: { createdAt: { gte: startOfMonth, lt: endOfMonth } },
          }),
          prisma.purchaseOrder.count({
            where: {
              prId: { not: null },
              createdAt: { gte: startOfMonth, lt: endOfMonth },
            },
          }),
          prisma.inventoryIssue.count({
            where: {
              status: 'POSTED',
              createdAt: { gte: startOfMonth, lt: endOfMonth },
            },
          }),
        ]),
      );
    }

    const chartResults = await Promise.all(chartPromises);
    const conversionChart = chartResults.map(([prs, converted]) =>
      prs > 0 ? Math.round((converted / prs) * 100) : 100,
    );
    const velocityChart = chartResults.map(([, , issues]) =>
      Math.min(100, Math.round((issues / 50) * 100)),
    );

    const systemAuditLogs = auditLogsList.map((log) => ({
      id: log.id,
      action: log.action,
      user: log.user?.name ?? 'System',
      time: log.createdAt.toISOString(),
    }));

    const result = {
      inventoryHealth: {
        totalValue,
        currency,
        currencySymbol,
        activeStocktakes,
        lowStockItems: lowStockCount,
        nearExpiryItems: nearExpiryCount,
      },
      activitySummary: {
        pendingApprovals: pendingPrs,
        activePOs,
        pendingGRNs,
        activeUsers: activeUserCount,
      },
      recentRequests,
      activityLog,
      expiringLots: expiringLotsFormatted,
      pendingApprovals: pendingApprovalsFormatted,

      // --- New Global Metrics ---
      pendingFulfillmentCount,
      todayConsumption,
      totalWarehouseItems,
      stockedWarehouseItems,
      warehouseCapacity,
      systemHealth,
      stockHealth,

      totalProcurementSpend,
      topVendors,

      poConversionRate,
      fulfillmentCycleDays,
      throughputWeek,

      conversionChart,
      velocityChart,

      systemAuditLogs,
    };
    
    console.log(JSON.stringify(result));
  } catch(err) {
    console.error('ERROR: ', err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
