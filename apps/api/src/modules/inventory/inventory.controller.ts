import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ActiveScope } from '../../auth/decorators/active-scope.decorator';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('balances')
  async getBalances(@ActiveScope('warehouseId') warehouseId: string) {
    return this.prisma.warehouseItem.findMany({
      where: { warehouseId },
      include: {
        item: true,
      },
    });
  }

  @Get('movements')
  async getMovements(
    @ActiveScope('warehouseId') warehouseId: string,
    @Query('itemId') itemId?: string,
  ) {
    const filter: any = { warehouseId };
    if (itemId) {
      filter.itemId = itemId;
    }
    return this.prisma.stockLedger.findMany({
      where: filter,
      include: {
        item: true,
        lot: true,
      },
      orderBy: {
        postedAt: 'desc',
      },
    });
  }
}
