import {
  Controller,
  Get,
  Patch,
  Query,
  UseGuards,
  Param,
  Body,
  Ip,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InventoryService } from './inventory.service';
import { ActiveScope } from '../../auth/decorators/active-scope.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiSecureController } from '../../decorators/swagger-docs.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import type {
  InventoryBalanceQuery,
  InventoryLotsQuery,
  InventoryMovementsQuery,
} from '@logirest/shared-types';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecureController()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async getWarehouseInventory(
    @Query('warehouseId') warehouseId: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!warehouseId) {
      throw new BadRequestException('warehouseId is required');
    }
    return this.inventoryService.getBalance(warehouseId, {
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Throttle({ short: { limit: 50, ttl: 1000 } })
  @Get('balance')
  async getBalance(
    @ActiveScope('warehouseId') warehouseId: string,
    @Query() query: InventoryBalanceQuery,
  ) {
    return this.inventoryService.getBalance(warehouseId, query);
  }

  @Get('lots')
  async getLots(
    @ActiveScope('warehouseId') warehouseId: string,
    @Query() query: InventoryLotsQuery,
  ) {
    return this.inventoryService.getLots(warehouseId, query);
  }

  @Get('movements')
  async getMovements(
    @ActiveScope('warehouseId') warehouseId: string,
    @Query() query: InventoryMovementsQuery,
  ) {
    return this.inventoryService.getMovements(warehouseId, query);
  }

  @Get('warehouses/:warehouseId/lock')
  async getWarehouseLock(@Param('warehouseId') warehouseId: string) {
    return this.inventoryService.getWarehouseLock(warehouseId);
  }

  @Patch(':id/unfreeze')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async unfreeze(
    @Param('id') itemId: string,
    @ActiveScope('warehouseId') warehouseId: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason: string,
    @Ip() ipAddress?: string,
  ) {
    if (!reason || reason.trim() === '') {
      throw new BadRequestException('An unfreeze reason is required.');
    }

    return this.inventoryService.unfreeze(
      itemId,
      warehouseId,
      userId,
      reason,
      ipAddress,
    );
  }
}

@Controller('items')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class ItemsController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Throttle({ short: { limit: 50, ttl: 1000 } })
  @Get('scan')
  async scanBarcode(
    @ActiveScope('warehouseId') warehouseId: string,
    @Query('barcode') barcode: string,
  ) {
    return this.inventoryService.scanBarcode(warehouseId, barcode);
  }
}
