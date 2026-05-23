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
import { GrnPostService } from '../grn-post.service';
import { WorkflowStateGuard } from '../../../guards/workflow-state.guard';
import { WorkflowAction } from '../../../decorators/workflow-action.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import type { Role } from '@logirest/shared-types';
import type { Request } from 'express';

@Controller('procurement/goods-received')
@ApiSecureController()
export class GrnController {
  constructor(private readonly grnPostService: GrnPostService) {}

  @Post(':id/post')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'grn',
    action: 'POST',
    modelName: 'goodsReceivedNote',
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

    return this.grnPostService.post(id, userId, role, body.version, ipAddress);
  }
}
