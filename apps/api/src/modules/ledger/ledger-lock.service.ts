import {
  Injectable,
  Logger,
  UnprocessableEntityException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, WarehouseItem, WarehouseItemLot } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LedgerLockService {
  private readonly logger = new Logger(LedgerLockService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Acquires a raw SQL SELECT FOR UPDATE lock on a global warehouse item balance.
   */
  async lockItem(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    itemId: string,
  ): Promise<WarehouseItem | null> {
    this.logger.debug(`Locking item row: wh=${warehouseId}, item=${itemId}`);
    const results = await tx.$queryRaw<WarehouseItem[]>`
      SELECT * FROM "warehouse_items"
      WHERE "warehouseId" = ${warehouseId} AND "itemId" = ${itemId}
      FOR UPDATE
    `;
    if (!results || results.length === 0) {
      return null;
    }
    return results[0];
  }

  /**
   * Acquires raw SQL SELECT FOR UPDATE locks on a set of warehouse item lot balances.
   * Lock acquisition order is sorted deterministically by lot ID to prevent deadlocks.
   */
  async lockLots(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    itemId: string,
    lotIds: string[],
  ): Promise<WarehouseItemLot[]> {
    if (!lotIds || lotIds.length === 0) {
      return [];
    }

    // Deterministic sorted ordering to prevent database deadlocks
    const sortedLotIds = [...lotIds].sort();
    const lockedLots: WarehouseItemLot[] = [];

    this.logger.debug(
      `Locking lot rows in sorted order: wh=${warehouseId}, item=${itemId}, lots=${sortedLotIds.join(',')}`,
    );

    for (const lotId of sortedLotIds) {
      const results = await tx.$queryRaw<WarehouseItemLot[]>`
        SELECT * FROM "warehouse_item_lots"
        WHERE "warehouseId" = ${warehouseId} AND "itemId" = ${itemId} AND "lotId" = ${lotId}
        FOR UPDATE
      `;
      if (results && results.length > 0) {
        lockedLots.push(results[0]);
      }
    }

    return lockedLots;
  }

  /**
   * Asserts that locked item has enough stock post-lock.
   */
  assertItemBalance(
    warehouseItem: WarehouseItem | null,
    requiredQty: number,
    itemId: string,
  ): void {
    if (!warehouseItem) {
      throw new BadRequestException(
        'Insufficient stock: requested quantity exceeds available on hand.',
      );
    }
    const currentQty = Number(warehouseItem.qtyOnHand);
    if (currentQty < requiredQty) {
      throw new BadRequestException(
        'Insufficient stock: requested quantity exceeds available on hand.',
      );
    }
  }

  /**
   * Asserts that locked lot has enough stock post-lock.
   */
  assertLotBalance(
    warehouseItemLot: WarehouseItemLot | null,
    requiredQty: number,
    lotId: string,
  ): void {
    if (!warehouseItemLot) {
      throw new BadRequestException(
        'Insufficient stock: requested quantity exceeds available on hand.',
      );
    }
    const currentQty = Number(warehouseItemLot.qtyOnHand);
    if (currentQty < requiredQty) {
      throw new BadRequestException(
        'Insufficient stock: requested quantity exceeds available on hand.',
      );
    }
  }
}
