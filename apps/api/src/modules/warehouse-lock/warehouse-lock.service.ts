import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

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
  ): Promise<any> {
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
        data: { isActive: false },
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
            expiresAt: lock.expiresAt,
            warehouseId: lock.warehouseId,
          }),
          afterStateJson: JSON.stringify({
            isActive: false,
            reason_notes: reasonNotes,
          }),
          ipAddress: ipAddress || null,
        },
      });

      return updatedLock;
    });
  }
}
