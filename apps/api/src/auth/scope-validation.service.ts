import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class ScopeValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async checkWarehouseItemQuarantine(
    warehouseId: string,
    itemId: string,
    sku?: string,
  ): Promise<void> {
    const whItem = await this.prisma.warehouseItem.findUnique({
      where: { warehouseId_itemId: { warehouseId, itemId } },
      select: { isFrozen: true },
    });
    if (whItem?.isFrozen) {
      throw new BadRequestException(
        `Item ${sku ?? itemId} is frozen/locked in warehouse ${warehouseId}`,
      );
    }
  }

  async validateWarehouse(
    userId: string,
    role: Role,
    warehouseId: string,
  ): Promise<void> {
    if (role === Role.ADMIN || role === Role.GM) return;

    if (role === Role.KITCHEN_CHIEF) {
      const wh = await this.prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: { branchId: true },
      });
      if (!wh) {
        throw new ForbiddenException('Warehouse not found.');
      }
      const deptScopes = await this.prisma.userDepartmentScope.findMany({
        where: { userId },
        include: { department: true },
      });
      const hasScopeInBranch = deptScopes.some(
        (ds) => ds.department.branchId === wh.branchId,
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
      const wh = await this.prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: { branchId: true },
      });
      if (!wh) {
        throw new ForbiddenException('Warehouse not found.');
      }
      const hasBranchScope = await this.prisma.userBranchScope.findUnique({
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

    const hasScope = await this.prisma.userWarehouseScope.findUnique({
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
  ): Promise<void> {
    if (role === Role.ADMIN || role === Role.GM) return;

    const hasScope = await this.prisma.userDepartmentScope.findUnique({
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
  ): Promise<void> {
    if (role === Role.ADMIN || role === Role.GM) return;
    const scopes = await this.prisma.userWarehouseScope.findMany({
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
