import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role, Prisma } from '@prisma/client';

@Injectable()
export class ScopeValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async checkWarehouseItemQuarantine(
    warehouseId: string,
    itemId: string,
    sku?: string,
  ): Promise<void> {
    if (!warehouseId || warehouseId.trim() === '') {
      throw new BadRequestException('Warehouse ID is required.');
    }
    if (!itemId || itemId.trim() === '') {
      throw new BadRequestException('Item ID is required.');
    }
    const whItem = await this.prisma.warehouseItem.findUnique({
      where: { warehouseId_itemId: { warehouseId, itemId } },
      select: {
        isFrozen: true,
        warehouse: { select: { name: true, code: true } },
        item: { select: { name: true, sku: true } },
      },
    });
    if (whItem?.isFrozen) {
      const whName = whItem.warehouse?.name || whItem.warehouse?.code || warehouseId;
      const itemName = whItem.item?.name || whItem.item?.sku || sku || itemId;
      throw new BadRequestException(
        `Item "${itemName}" is frozen/locked in warehouse "${whName}"`,
      );
    }
  }

  async validateWarehouse(
    userId: string,
    role: Role,
    warehouseId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx || this.prisma;
    if (role === Role.ADMIN || role === Role.GM) return;

    if (!warehouseId || warehouseId.trim() === '') {
      throw new BadRequestException('Warehouse ID is required.');
    }

    if (role === Role.KITCHEN_CHIEF) {
      const wh = await db.warehouse.findUnique({
        where: { id: warehouseId },
        select: { branchId: true },
      });
      if (!wh) {
        throw new ForbiddenException('Warehouse not found.');
      }
      const deptScopes = await db.userDepartmentScope.findMany({
        where: { userId },
        include: { department: true },
      });
      const hasScopeInBranch = deptScopes.some(
        (ds: { department: { branchId: string } }) => ds.department.branchId === wh.branchId,
      );
      if (!hasScopeInBranch) {
        throw new ForbiddenException(
          'Access to this warehouse branch is not authorized.',
        );
      }
      return;
    }

    if (
      role === Role.BRANCH_MGR ||
      role === Role.PROC_MGR ||
      role === Role.INV_MGR ||
      role === Role.STORE_MGR ||
      role === Role.PROC_OFFICER
    ) {
      const wh = await db.warehouse.findUnique({
        where: { id: warehouseId },
        select: { branchId: true },
      });
      if (!wh) {
        throw new ForbiddenException('Warehouse not found.');
      }
      const hasBranchScope = await db.userBranchScope.findUnique({
        where: { userId_branchId: { userId, branchId: wh.branchId } },
      });
      if (hasBranchScope) {
        return;
      }
      if (role === Role.BRANCH_MGR) {
        throw new ForbiddenException(
          'Access to this branch is not authorized.',
        );
      }
    }

    const hasScope = await db.userWarehouseScope.findUnique({
      where: { userId_warehouseId: { userId, warehouseId } },
    });
    if (!hasScope) {
      throw new ForbiddenException(
        'Access to this warehouse is not authorized.',
      );
    }
  }

  async validateDepartment(
    userId: string,
    role: Role,
    departmentId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx || this.prisma;
    if (role === Role.ADMIN || role === Role.GM) return;

    if (!departmentId || departmentId.trim() === '') {
      throw new BadRequestException('Department ID is required.');
    }

    const hasScope = await db.userDepartmentScope.findUnique({
      where: { userId_departmentId: { userId, departmentId } },
    });
    if (!hasScope) {
      throw new ForbiddenException(
        'Access to this department is not authorized.',
      );
    }
  }

  async validateAtLeastOneWarehouse(
    userId: string,
    role: Role,
    warehouseIds: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx || this.prisma;
    if (role === Role.ADMIN || role === Role.GM) return;
    if (!warehouseIds || warehouseIds.length === 0) {
      throw new BadRequestException(
        'At least one Warehouse ID must be provided.',
      );
    }
    const scopes = await db.userWarehouseScope.findMany({
      where: { userId, warehouseId: { in: warehouseIds } },
      select: { warehouseId: true },
    });
    if (scopes.length === 0) {
      throw new ForbiddenException(
        'Access to none of the requested warehouses is authorized.',
      );
    }
  }
}
