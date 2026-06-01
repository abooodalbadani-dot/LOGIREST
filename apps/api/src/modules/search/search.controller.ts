import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async search(
    @Query('q') q: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    if (!q || q.trim() === '') {
      return [];
    }

    const query = q.trim();

    let allowedWarehouseIds: string[] | undefined = undefined;
    if (role !== Role.ADMIN) {
      const scopes = await this.prisma.userWarehouseScope.findMany({
        where: { userId },
        select: { warehouseId: true },
      });
      allowedWarehouseIds = scopes.map((s) => s.warehouseId);
    }

    // 1. Search items
    const items = await this.prisma.item.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });

    // 2. Search suppliers
    const suppliers = await this.prisma.supplier.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { code: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });

    // 3. Search lots
    const lots = await this.prisma.lot.findMany({
      where: {
        lotNumber: { contains: query, mode: 'insensitive' },
        ...(allowedWarehouseIds
          ? {
              warehouseItemLots: {
                some: {
                  warehouseId: { in: allowedWarehouseIds },
                },
              },
            }
          : {}),
      },
      take: 10,
    });

    // 4. Search documents (GRNs, POs, Transfers, Issues)
    const grns = await this.prisma.goodsReceivedNote.findMany({
      where: {
        grnNumber: { contains: query, mode: 'insensitive' },
        ...(allowedWarehouseIds
          ? { warehouseId: { in: allowedWarehouseIds } }
          : {}),
      },
      take: 5,
    });

    const pos = await this.prisma.purchaseOrder.findMany({
      where: {
        poNumber: { contains: query, mode: 'insensitive' },
        ...(allowedWarehouseIds
          ? {
              purchaseRequest: {
                warehouseId: { in: allowedWarehouseIds },
              },
            }
          : {}),
      },
      take: 5,
    });

    const transfers = await this.prisma.transfer.findMany({
      where: {
        transferNumber: { contains: query, mode: 'insensitive' },
        ...(allowedWarehouseIds
          ? {
              OR: [
                { fromWarehouseId: { in: allowedWarehouseIds } },
                { toWarehouseId: { in: allowedWarehouseIds } },
              ],
            }
          : {}),
      },
      take: 5,
    });

    const issues = await this.prisma.inventoryIssue.findMany({
      where: {
        issueNumber: { contains: query, mode: 'insensitive' },
        ...(allowedWarehouseIds
          ? { warehouseId: { in: allowedWarehouseIds } }
          : {}),
      },
      take: 5,
    });

    const results: any[] = [];

    // Map items
    items.forEach((item) => {
      results.push({
        id: item.id,
        type: 'item',
        title: item.name,
        subtitle: `SKU: ${item.sku}`,
        status: item.isActive ? 'ACTIVE' : 'INACTIVE',
        metadata: {
          SKU: item.sku,
        },
        link: '/inventory/balance',
      });
    });

    // Map suppliers
    suppliers.forEach((supplier) => {
      results.push({
        id: supplier.id,
        type: 'supplier',
        title: supplier.name,
        subtitle: supplier.code,
        status: supplier.isActive ? 'ACTIVE' : 'INACTIVE',
        link: `/master-data/suppliers/${supplier.id}`,
      });
    });

    // Map lots
    lots.forEach((lot) => {
      results.push({
        id: lot.id,
        type: 'lot',
        title: lot.lotNumber,
        subtitle: `Lot Number`,
        link: `/inventory/lots/${lot.lotNumber}`,
      });
    });

    // Map GRNs
    grns.forEach((grn) => {
      results.push({
        id: grn.id,
        type: 'document',
        title: grn.grnNumber,
        subtitle: 'Goods Received Note',
        status: grn.status,
        link: `/goods-received/${grn.id}`,
      });
    });

    // Map POs
    pos.forEach((po) => {
      results.push({
        id: po.id,
        type: 'document',
        title: po.poNumber,
        subtitle: 'Purchase Order',
        status: po.status,
        link: `/purchase-orders/${po.id}`,
      });
    });

    // Map transfers
    transfers.forEach((t) => {
      results.push({
        id: t.id,
        type: 'document',
        title: t.transferNumber,
        subtitle: 'Transfer',
        status: t.status,
        link: `/transfers/${t.id}`,
      });
    });

    // Map issues
    issues.forEach((i) => {
      results.push({
        id: i.id,
        type: 'document',
        title: i.issueNumber,
        subtitle: 'Inventory Issue',
        status: i.status,
        link: `/issues/${i.id}`,
      });
    });

    return results;
  }
}
