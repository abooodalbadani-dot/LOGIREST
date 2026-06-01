import {
  Controller,
  Patch,
  UseGuards,
  Param,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiSecureController } from '../../decorators/swagger-docs.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { ScopeValidationService } from '../../auth/scope-validation.service';
import { PrismaService } from '../../database/prisma.service';

@Controller('lots')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class LotsController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly scopeValidationService: ScopeValidationService,
    private readonly prisma: PrismaService,
  ) {}

  @Patch(':id/quarantine')
  @Roles(Role.ADMIN, Role.INV_MGR)
  async quarantineLot(
    @Param('id') lotId: string,
    @CurrentUser('role') role: Role,
    @CurrentUser('id') userId: string,
  ) {
    const warehouseLots = await this.prisma.warehouseItemLot.findMany({
      where: { lotId },
      select: { warehouseId: true },
    });
    const warehouseIds = warehouseLots.map((wl) => wl.warehouseId);
    await this.scopeValidationService.validateAtLeastOneWarehouse(
      userId,
      role,
      warehouseIds,
    );

    return this.inventoryService.quarantineLot(lotId, userId);
  }

  @Patch(':id/release-quarantine')
  @Roles(Role.ADMIN, Role.INV_MGR)
  async releaseQuarantineLot(
    @Param('id') lotId: string,
    @CurrentUser('role') role: Role,
    @CurrentUser('id') userId: string,
  ) {
    const warehouseLots = await this.prisma.warehouseItemLot.findMany({
      where: { lotId },
      select: { warehouseId: true },
    });
    const warehouseIds = warehouseLots.map((wl) => wl.warehouseId);
    await this.scopeValidationService.validateAtLeastOneWarehouse(
      userId,
      role,
      warehouseIds,
    );

    return this.inventoryService.releaseQuarantineLot(lotId, userId);
  }
}
