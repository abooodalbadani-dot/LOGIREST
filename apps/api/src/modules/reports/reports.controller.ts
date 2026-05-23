import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ActiveScope } from '../../auth/decorators/active-scope.decorator';

@Controller('reports')
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
}
