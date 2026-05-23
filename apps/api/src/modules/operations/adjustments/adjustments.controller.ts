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
import { AdjustmentPostService } from '../adjustment-post.service';
import { WorkflowStateGuard } from '../../../guards/workflow-state.guard';
import { WorkflowAction } from '../../../decorators/workflow-action.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { Role } from '@logirest/shared-types';
import type { Request } from 'express';

@Controller('operations/adjustments')
export class AdjustmentsController {
  constructor(private readonly adjPostService: AdjustmentPostService) {}

  @Post(':id/post')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'adjustment',
    action: 'POST',
    modelName: 'adjustment',
  })
  @HttpCode(HttpStatus.OK)
  async post(
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

    return this.adjPostService.post(id, userId, role, body.version, ipAddress);
  }
}
