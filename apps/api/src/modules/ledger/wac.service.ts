import { Injectable, Logger } from '@nestjs/common';
import { Prisma, DocumentType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { LedgerLockService } from './ledger-lock.service';

@Injectable()
export class WacService {
  private readonly logger = new Logger(WacService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: LedgerLockService,
  ) {}

  /**
   * Recalculates Weighted Average Cost (WAC) on Goods Received Note (GRN) receipt,
   * updates the WarehouseItem, and logs to CostLedger.
   */
  async recalculate(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    itemId: string,
    receivedQty: number,
    receivedCost: number,
    documentId: string,
    idempotencyKey?: string,
  ): Promise<number> {
    this.logger.log(
      `Recalculating WAC for item ${itemId} in wh ${warehouseId}. Received: ${receivedQty} @ ${receivedCost}`,
    );

    // 1. Lock the WarehouseItem row to get latest qtyOnHand and WAC
    const whItem = await this.lockService.lockItem(tx, warehouseId, itemId);
    if (!whItem) {
      throw new Error(
        `WarehouseItem not found for wh=${warehouseId}, item=${itemId}`,
      );
    }

    const currentQty = Number(whItem.qtyOnHand);
    const currentWac = Number(whItem.wac);

    let newWac: number;
    if (currentQty <= 0) {
      newWac = receivedCost;
    } else {
      const currentTotalCost = currentQty * currentWac;
      const receivedTotalCost = receivedQty * receivedCost;
      const totalQty = currentQty + receivedQty;

      if (totalQty <= 0) {
        newWac = receivedCost;
      } else {
        newWac = (currentTotalCost + receivedTotalCost) / totalQty;
      }
    }

    // Round to 4 decimal places
    newWac = Math.round(newWac * 10000) / 10000;

    // 2. Update WAC on WarehouseItem
    await tx.warehouseItem.update({
      where: { warehouseId_itemId: { warehouseId, itemId } },
      data: { wac: newWac },
    });

    // 3. Log mutation to CostLedger
    await tx.costLedger.create({
      data: {
        warehouseId,
        itemId,
        quantity: receivedQty,
        unitPrice: receivedCost,
        newWac: newWac,
        documentId,
        documentType: DocumentType.GOODS_RECEIVED_NOTE,
        idempotencyKey,
      },
    });

    return newWac;
  }

  /**
   * Enforces positive adjustments inheriting current WAC without recalculating.
   * Logs an entry in CostLedger to track the transaction.
   */
  async handlePositiveAdjustment(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    itemId: string,
    adjustedQty: number, // must be positive
    documentId: string,
    idempotencyKey?: string,
  ): Promise<number> {
    this.logger.log(
      `Handling positive adjustment for item ${itemId} in wh ${warehouseId}. Qty: ${adjustedQty}`,
    );

    // 1. Lock the WarehouseItem row
    const whItem = await this.lockService.lockItem(tx, warehouseId, itemId);
    if (!whItem) {
      throw new Error(
        `WarehouseItem not found for wh=${warehouseId}, item=${itemId}`,
      );
    }

    const currentWac = Number(whItem.wac);

    // 2. Log to CostLedger with current WAC (no change to unit cost basis)
    await tx.costLedger.create({
      data: {
        warehouseId,
        itemId,
        quantity: adjustedQty,
        unitPrice: currentWac, // inherits current WAC
        newWac: currentWac, // WAC remains unchanged
        documentId,
        documentType: DocumentType.ADJUSTMENT,
        idempotencyKey,
      },
    });

    return currentWac;
  }
}
