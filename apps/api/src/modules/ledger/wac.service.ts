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

    const currentQty = new Prisma.Decimal(whItem.qtyOnHand);
    const currentWac = new Prisma.Decimal(whItem.wac);
    const rxQty = new Prisma.Decimal(receivedQty);
    const rxCost = new Prisma.Decimal(receivedCost);

    let newWac: Prisma.Decimal;
    if (currentQty.lte(0)) {
      newWac = rxCost;
    } else {
      const currentTotalCost = currentQty.mul(currentWac);
      const receivedTotalCost = rxQty.mul(rxCost);
      const totalQty = currentQty.add(rxQty);

      if (totalQty.lte(0)) {
        newWac = rxCost;
      } else {
        newWac = currentTotalCost.add(receivedTotalCost).div(totalQty);
      }
    }

    // Round to 4 decimal places
    const roundedWac = newWac.toDecimalPlaces(4);

    // 2. Update WAC on WarehouseItem
    await tx.warehouseItem.update({
      where: { warehouseId_itemId: { warehouseId, itemId } },
      data: { wac: roundedWac },
    });

    // 3. Log mutation to CostLedger
    await tx.costLedger.create({
      data: {
        warehouseId,
        itemId,
        quantity: rxQty,
        unitPrice: rxCost,
        newWac: roundedWac,
        documentId,
        documentType: DocumentType.GOODS_RECEIVED_NOTE,
        idempotencyKey,
      },
    });

    return roundedWac.toNumber();
  }

  /**
   * Enforces positive adjustments recalculating WAC.
   * Logs an entry in CostLedger to track the transaction.
   */
  async handlePositiveAdjustment(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    itemId: string,
    adjustedQty: number, // must be positive
    adjustedCost: number,
    documentId: string,
    idempotencyKey?: string,
  ): Promise<number> {
    this.logger.log(
      `Handling positive adjustment for item ${itemId} in wh ${warehouseId}. Qty: ${adjustedQty} @ ${adjustedCost}`,
    );

    // 1. Lock the WarehouseItem row
    const whItem = await this.lockService.lockItem(tx, warehouseId, itemId);
    if (!whItem) {
      throw new Error(
        `WarehouseItem not found for wh=${warehouseId}, item=${itemId}`,
      );
    }

    const currentQty = new Prisma.Decimal(whItem.qtyOnHand);
    const currentWac = new Prisma.Decimal(whItem.wac);
    const adjQty = new Prisma.Decimal(adjustedQty);
    const adjCost = new Prisma.Decimal(adjustedCost);

    let newWac: Prisma.Decimal;
    if (currentQty.lte(0)) {
      newWac = adjCost;
    } else {
      const currentTotalCost = currentQty.mul(currentWac);
      const receivedTotalCost = adjQty.mul(adjCost);
      const totalQty = currentQty.add(adjQty);

      if (totalQty.lte(0)) {
        newWac = adjCost;
      } else {
        newWac = currentTotalCost.add(receivedTotalCost).div(totalQty);
      }
    }

    // Round to 4 decimal places
    const roundedWac = newWac.toDecimalPlaces(4);

    // 2. Update WAC on WarehouseItem
    await tx.warehouseItem.update({
      where: { warehouseId_itemId: { warehouseId, itemId } },
      data: { wac: roundedWac },
    });

    // 3. Log to CostLedger
    await tx.costLedger.create({
      data: {
        warehouseId,
        itemId,
        quantity: adjQty,
        unitPrice: adjCost,
        newWac: roundedWac,
        documentId,
        documentType: DocumentType.ADJUSTMENT,
        idempotencyKey,
      },
    });

    return roundedWac.toNumber();
  }
}
