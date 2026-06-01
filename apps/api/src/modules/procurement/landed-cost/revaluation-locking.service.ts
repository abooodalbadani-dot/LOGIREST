import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class RevaluationLockingService {
  private readonly logger = new Logger(RevaluationLockingService.name);

  async lockWarehouseItems(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    itemIds: string[],
  ): Promise<void> {
    if (!itemIds.length) return;

    const sortedItems = [...itemIds].sort();

    for (const itemId of sortedItems) {
      this.logger.debug(
        `Locking warehouse_item: wh=${warehouseId}, item=${itemId}`,
      );
      await tx.$queryRaw`
        SELECT * FROM "warehouse_items"
        WHERE "warehouseId" = ${warehouseId} AND "itemId" = ${itemId}
        FOR UPDATE
      `;
    }
  }

  async lockWarehouseItemLots(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    itemId: string,
    lotIds: string[],
  ): Promise<void> {
    if (!lotIds.length) return;

    const sortedLots = [...lotIds].sort();

    for (const lotId of sortedLots) {
      this.logger.debug(
        `Locking warehouse_item_lot: wh=${warehouseId}, item=${itemId}, lot=${lotId}`,
      );
      await tx.$queryRaw`
        SELECT * FROM "warehouse_item_lots"
        WHERE "warehouseId" = ${warehouseId} AND "itemId" = ${itemId} AND "lotId" = ${lotId}
        FOR UPDATE
      `;
    }
  }
}
