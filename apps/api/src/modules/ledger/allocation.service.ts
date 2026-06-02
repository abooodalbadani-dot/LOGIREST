import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
  BadRequestException,
} from '@nestjs/common';
import { LotStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { LedgerLockService } from './ledger-lock.service';

@Injectable()
export class AllocationService {
  private readonly logger = new Logger(AllocationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: LedgerLockService,
  ) {}

  async allocate(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    itemId: string,
    requiredQty: number,
  ): Promise<Array<{ lotId: string; quantityAllocated: number }>> {
    this.logger.log(
      `Allocating ${requiredQty} of item ${itemId} in warehouse ${warehouseId}`,
    );

    // 1. Fetch Item configuration
    const item = await tx.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${itemId} not found`);
    }

    // Case A: Unbatched item (no lots, no expiry)
    if (!item.isBatched && !item.hasExpiry) {
      const whItem = await this.lockService.lockItem(tx, warehouseId, itemId);

      this.lockService.assertItemBalance(whItem, requiredQty, itemId);

      await tx.warehouseItem.update({
        where: { warehouseId_itemId: { warehouseId, itemId } },
        data: { qtyOnHand: { decrement: requiredQty } },
      });

      return [];
    }

    // Case B & C: Batched items
    // Fetch all ACTIVE lots with stock (> 0) in the warehouse.
    // HOLD and QUARANTINE lots are excluded — they must not be issued.
    const lotBalances = await tx.warehouseItemLot.findMany({
      where: {
        warehouseId,
        itemId,
        qtyOnHand: { gt: 0 },
        lot: { status: LotStatus.ACTIVE },
      },
      include: {
        lot: true,
      },
    });

    const now = new Date();
    let activeLots = lotBalances.map((lb) => ({
      lotId: lb.lotId,
      qtyOnHand: Number(lb.qtyOnHand),
      expiryDate: lb.lot.expiryDate ? new Date(lb.lot.expiryDate) : null,
      receivedDate: new Date(lb.lot.receivedDate),
    }));

    if (item.hasExpiry) {
      // FEFO: Exclude expired lots, sort by expiry date ASC, then received date ASC
      activeLots = activeLots.filter(
        (lot) =>
          lot.expiryDate === null || lot.expiryDate.getTime() >= now.getTime(),
      );
      activeLots.sort((a, b) => {
        if (!a.expiryDate && !b.expiryDate)
          return a.receivedDate.getTime() - b.receivedDate.getTime();
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        if (a.expiryDate.getTime() === b.expiryDate.getTime()) {
          return a.receivedDate.getTime() - b.receivedDate.getTime();
        }
        return a.expiryDate.getTime() - b.expiryDate.getTime();
      });
    } else {
      // FIFO: Sort by received date ASC
      activeLots.sort(
        (a, b) => a.receivedDate.getTime() - b.receivedDate.getTime(),
      );
    }

    // Lock candidate lots in sorted order (lotId ASC) to prevent deadlocks
    const lotIds = activeLots.map((l) => l.lotId);
    const lockedLotRows = await this.lockService.lockLots(
      tx,
      warehouseId,
      itemId,
      lotIds,
    );

    // Map locked quantities back to candidate lots
    const lockedQtyMap = new Map<string, number>();
    for (const row of lockedLotRows) {
      lockedQtyMap.set(row.lotId, Number(row.qtyOnHand));
    }

    activeLots = activeLots
      .map((lot) => ({
        ...lot,
        qtyOnHand: lockedQtyMap.get(lot.lotId) ?? 0,
      }))
      .filter((lot) => lot.qtyOnHand > 0);

    // Lock the parent WarehouseItem row to prevent concurrent updates on the total balance
    await this.lockService.lockItem(tx, warehouseId, itemId);

    // Calculate total available stock across all active lots
    const totalAvailable = activeLots.reduce(
      (sum, lot) => sum + lot.qtyOnHand,
      0,
    );
    if (totalAvailable < requiredQty) {
      throw new BadRequestException('INSUFFICIENT_STOCK');
    }

    // Progressively allocate
    let remainingToAllocate = requiredQty;
    const allocations: Array<{ lotId: string; quantityAllocated: number }> = [];

    for (const lot of activeLots) {
      if (remainingToAllocate <= 0) break;

      const allocatedFromLot = Math.min(lot.qtyOnHand, remainingToAllocate);
      allocations.push({
        lotId: lot.lotId,
        quantityAllocated: allocatedFromLot,
      });

      // Update WarehouseItemLot balance
      await tx.warehouseItemLot.update({
        where: {
          warehouseId_itemId_lotId: {
            warehouseId,
            itemId,
            lotId: lot.lotId,
          },
        },
        data: {
          qtyOnHand: { decrement: allocatedFromLot },
        },
      });

      remainingToAllocate -= allocatedFromLot;
    }

    // Update WarehouseItem total balance
    await tx.warehouseItem.update({
      where: { warehouseId_itemId: { warehouseId, itemId } },
      data: { qtyOnHand: { decrement: requiredQty } },
    });

    return allocations;
  }
}
