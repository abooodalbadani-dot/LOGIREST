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
import { Role } from '@prisma/client';
import { InventoryService } from './inventory.service';

@Controller('lots')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class LotsController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Patch(':id/quarantine')
  async quarantineLot(
    @Param('id') lotId: string,
    @CurrentUser('role') role: Role,
    @CurrentUser('id') userId: string,
  ) {
    if (role !== 'ADMIN' && role !== 'INV_MGR') {
      throw new ForbiddenException(
        'Only administrative users or inventory managers are authorized to quarantine lots.',
      );
    }
    return this.inventoryService.quarantineLot(lotId, userId);
  }

  @Patch(':id/release-quarantine')
  async releaseQuarantineLot(
    @Param('id') lotId: string,
    @CurrentUser('role') role: Role,
    @CurrentUser('id') userId: string,
  ) {
    if (role !== 'ADMIN' && role !== 'INV_MGR') {
      throw new ForbiddenException(
        'Only administrative users or inventory managers are authorized to release lots from quarantine.',
      );
    }
    return this.inventoryService.releaseQuarantineLot(lotId, userId);
  }
}
