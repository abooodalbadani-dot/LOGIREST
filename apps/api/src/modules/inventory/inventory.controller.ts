import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { ActiveScope } from '../../auth/decorators/active-scope.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiSecureController } from '../../decorators/swagger-docs.decorator';
import type {
  InventoryBalanceQuery,
  InventoryLotsQuery,
  InventoryMovementsQuery,
} from '@logirest/shared-types';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

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
}

@Controller('items')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class ItemsController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('scan')
  async scanBarcode(
    @ActiveScope('warehouseId') warehouseId: string,
    @Query('barcode') barcode: string,
  ) {
    return this.inventoryService.scanBarcode(warehouseId, barcode);
  }
}
