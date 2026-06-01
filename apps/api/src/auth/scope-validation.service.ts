import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class ScopeValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async validateWarehouse(
    userId: string,
    role: Role,
    warehouseId: string,
  ): Promise<void> {
    if (role === Role.ADMIN) return;
    const hasScope = await this.prisma.userWarehouseScope.findUnique({
      where: { userId_warehouseId: { userId, warehouseId } },
    });
    if (!hasScope) {
      throw new ForbiddenException(
        'Access to this warehouse is not authorized.',
      );
    }
  }

  async validateAtLeastOneWarehouse(
    userId: string,
    role: Role,
    warehouseIds: string[],
  ): Promise<void> {
    if (role === Role.ADMIN) return;
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
