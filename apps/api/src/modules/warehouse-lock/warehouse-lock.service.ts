import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WarehouseLock } from '@prisma/client';

@Injectable()
export class WarehouseLockService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deactivates a warehouse lock and logs the override event in the audit log.
   */
  async forceUnlock(
    lockId: string,
    adminId: string,
    reasonNotes: string,
    ipAddress?: string,
  ): Promise<WarehouseLock> {
    // 1. Retrieve the lock details
    const lock = await this.prisma.warehouseLock.findUnique({
      where: { id: lockId },
    });

    if (!lock) {
      throw new NotFoundException(
        `Warehouse lock with ID ${lockId} not found.`,
      );
    }

    // 2. Validate that it's active
    if (!lock.isActive) {
      throw new BadRequestException('Lock is not active.');
    }

    // 3. Execute the override transaction
    return this.prisma.$transaction(async (tx) => {
      // Deactivate the lock
      const updatedLock = await tx.warehouseLock.update({
        where: { id: lockId },
        data: { isActive: false, status: 'RELEASED' },
      });

      // Write the override audit log entry
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'FORCE_UNLOCK',
          targetTable: 'warehouse_locks',
          targetId: lockId,
          beforeStateJson: JSON.stringify({
            isActive: true,
            status: lock.status,
            expiresAt: lock.expiresAt,
            warehouseId: lock.warehouseId,
          }),
          afterStateJson: JSON.stringify({
            isActive: false,
            status: 'RELEASED',
            reason_notes: reasonNotes,
          }),
          ipAddress: ipAddress || null,
        },
      });

      return updatedLock;
    });
  }

  /**
   * Manually deactivates a warehouse lock for Admin/Manager roles.
   */
  async manualUnlock(
    lockId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<WarehouseLock> {
    const lock = await this.prisma.warehouseLock.findUnique({
      where: { id: lockId },
    });

    if (!lock) {
      throw new NotFoundException(
        `Warehouse lock with ID ${lockId} not found.`,
      );
    }

    if (!lock.isActive) {
      throw new BadRequestException('Lock is not active.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedLock = await tx.warehouseLock.update({
        where: { id: lockId },
        data: { isActive: false, status: 'RELEASED' },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'MANUAL_UNLOCK',
          targetTable: 'warehouse_locks',
          targetId: lockId,
          beforeStateJson: JSON.stringify({
            isActive: true,
            status: lock.status,
            expiresAt: lock.expiresAt,
            warehouseId: lock.warehouseId,
          }),
          afterStateJson: JSON.stringify({
            isActive: false,
            status: 'RELEASED',
          }),
          ipAddress: ipAddress || null,
        },
      });

      return updatedLock;
    });
  }
}
