/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Post,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { TransferPostService } from '../transfer-post.service';
import { WorkflowStateGuard } from '../../../guards/workflow-state.guard';
import { WorkflowAction } from '../../../decorators/workflow-action.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { Role } from '@logirest/shared-types';
import type { Request } from 'express';

@Controller('operations/transfers')
export class TransfersController {
  constructor(private readonly transferPostService: TransferPostService) {}

  @Post(':id/ship')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'transfer',
    action: 'SHIP',
    modelName: 'transfer',
  })
  @HttpCode(HttpStatus.OK)
  async ship(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body() body: { version?: number },
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    return this.transferPostService.ship(
      id,
      userId,
      role,
      body.version,
      ipAddress,
    );
  }

  @Post(':id/receive')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'transfer',
    action: 'RECEIVE',
    modelName: 'transfer',
  })
  @HttpCode(HttpStatus.OK)
  async receive(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body()
    body: {
      version?: number;
      linesReceived?: Array<{
        lineId: string;
        quantityReceived: number;
        varianceReason?: string;
      }>;
    },
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    return this.transferPostService.receive(
      id,
      userId,
      role,
      body.version,
      ipAddress,
      body.linesReceived,
    );
  }
}
