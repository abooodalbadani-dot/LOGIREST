import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LotsAvailableService {
  constructor(private readonly prisma: PrismaService) {}

  async getLotsAvailable(itemId: string, warehouseId?: string) {
    if (!itemId) {
      throw new BadRequestException('itemId is a required query parameter');
    }

    // Fetch all lots created for this item, and attach warehouse balance if available
    const lots = await this.prisma.lot.findMany({
      where: {
        itemId,
      },
      include: {
        warehouseItemLots: warehouseId
          ? {
              where: { warehouseId },
            }
          : true,
      },
      orderBy: {
        expiryDate: 'asc',
      },
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const data = lots.map((lot) => {
      const itemLot = lot.warehouseItemLots?.[0];
      const isExpired = lot.expiryDate ? new Date(lot.expiryDate) < now : false;
      const isNearExpiry = lot.expiryDate
        ? new Date(lot.expiryDate) >= now &&
          new Date(lot.expiryDate) < thirtyDaysFromNow
        : false;

      const qtyOnHand = itemLot ? parseFloat(itemLot.qtyOnHand.toString()) : 0;
      const qtyAllocated = itemLot ? parseFloat(itemLot.qtyAllocated.toString()) : 0;
      const qtyAvailable = qtyOnHand - qtyAllocated;

      return {
        id: lot.id,
        itemId: lot.itemId,
        lotNumber: lot.lotNumber,
        expiryDate: lot.expiryDate ? lot.expiryDate.toISOString() : '',
        totalQty: qtyOnHand,
        qtyAvailable: qtyAvailable >= 0 ? qtyAvailable : 0,
        isExpired: isExpired,
        isNearExpiry: isNearExpiry,
        // Compatibility aliases
        item_id: lot.itemId,
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
