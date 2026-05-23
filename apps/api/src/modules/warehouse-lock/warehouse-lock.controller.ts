/* eslint-disable @typescript-eslint/no-unsafe-return */
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
import type { Role } from '@logirest/shared-types';
import { WarehouseLockService } from './warehouse-lock.service';

@Controller('warehouse-locks')
@UseGuards(JwtAuthGuard)
export class WarehouseLockController {
  constructor(private readonly warehouseLockService: WarehouseLockService) {}

  @Post(':id/force-unlock')
  async forceUnlock(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') role: Role,
    @Body() body: { reason_notes: string },
    @Req() req: Request,
  ) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException('Forbidden resource');
    }

    if (
      !body ||
      typeof body.reason_notes !== 'string' ||
      body.reason_notes.length < 10
    ) {
      throw new BadRequestException(
        'reason_notes must be longer than or equal to 10 characters',
      );
    }

    const ipAddress = req.ip || req.socket.remoteAddress;

    return this.warehouseLockService.forceUnlock(
      id,
      adminId,
      body.reason_notes,
      ipAddress,
    );
  }
}
