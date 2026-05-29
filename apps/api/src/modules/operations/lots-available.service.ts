import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LotsAvailableService {
  constructor(private readonly prisma: PrismaService) {}

  async getLotsAvailable(itemId: string, warehouseId: string) {
    if (!itemId || !warehouseId) {
      throw new BadRequestException('itemId and warehouseId are required query parameters');
    }

    const warehouseItemLots = await this.prisma.warehouseItemLot.findMany({
      where: {
        itemId,
        warehouseId,
        qtyOnHand: { gt: 0 },
      },
      include: {
        lot: true,
      },
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const data = warehouseItemLots.map((itemLot) => {
      const lot = itemLot.lot;
      const isExpired = lot.expiryDate ? new Date(lot.expiryDate) < now : false;
      const isNearExpiry = lot.expiryDate
        ? new Date(lot.expiryDate) >= now && new Date(lot.expiryDate) < thirtyDaysFromNow
        : false;

      const qtyOnHand = parseFloat(itemLot.qtyOnHand.toString());
      const qtyAllocated = parseFloat(itemLot.qtyAllocated.toString());
      const qtyAvailable = qtyOnHand - qtyAllocated;

      return {
        id: lot.id,
        item_id: itemId,
        lot_number: lot.lotNumber,
        expiry_date: lot.expiryDate ? lot.expiryDate.toISOString() : '',
        total_qty: qtyOnHand,
        qty_available: qtyAvailable >= 0 ? qtyAvailable : 0,
        is_expired: isExpired,
        is_near_expiry: isNearExpiry,
      };
    });

    return { data };
  }
}
