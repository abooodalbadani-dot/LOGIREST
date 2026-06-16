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
import { Role } from '@prisma/client';
import { WarehouseLockService } from './warehouse-lock.service';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('warehouse-locks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecureController()
export class WarehouseLockController {
  constructor(private readonly warehouseLockService: WarehouseLockService) {}

  @Post(':id/force-unlock')
  @Roles(Role.ADMIN)
  async forceUnlock(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { reasonNotes: string },
    @Req() req: Request,
  ) {
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
  @Roles(Role.ADMIN, Role.INV_MGR)
  async manualUnlock(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
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
