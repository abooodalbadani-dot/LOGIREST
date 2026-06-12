import {
  Controller,
  Post,
  UseGuards,
  Param,
  Body,
  Req,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ApiSecureController } from '../../decorators/swagger-docs.decorator';
import type { Role } from '@logirest/shared-types';
import { WarehouseLockService } from './warehouse-lock.service';

@Controller('warehouse-locks')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class WarehouseLockController {
  constructor(private readonly warehouseLockService: WarehouseLockService) {}

  @Post(':id/force-unlock')
  async forceUnlock(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') role: Role,
    @Body() body: { reasonNotes: string },
    @Req() req: Request,
  ) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException('Forbidden resource');
    }

    const reasonNotes = body?.reasonNotes;

    if (
      !reasonNotes ||
      typeof reasonNotes !== 'string' ||
      reasonNotes.length < 10
    ) {
      throw new BadRequestException(
        'reasonNotes must be longer than or equal to 10 characters',
      );
    }

    const ipAddress = req.ip || req.socket.remoteAddress;

    return this.warehouseLockService.forceUnlock(
      id,
      adminId,
      reasonNotes,
      ipAddress,
    );
  }

  @Post(':id/unlock')
  async manualUnlock(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Req() req: Request,
  ) {
    if (role !== 'ADMIN' && role !== 'INV_MGR') {
      throw new ForbiddenException(
        'Only admins and managers are authorized to manually release warehouse locks.',
      );
    }

    const ipAddress = req.ip || req.socket.remoteAddress;

    const updatedLock = await this.warehouseLockService.manualUnlock(
      id,
      userId,
      ipAddress,
    );

    return {
      success: true,
      message: 'Warehouse lock successfully released.',
      deactivatedAt: new Date().toISOString(),
    };
  }
}
