/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { KitchenRequestsService } from './kitchen-requests.service';
import { WorkflowStateGuard } from '../../guards/workflow-state.guard';
import { WorkflowAction } from '../../decorators/workflow-action.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Idempotent } from '../../decorators/idempotent.decorator';
import {
  ApiSecureController,
  ApiIdempotentHeader,
} from '../../decorators/swagger-docs.decorator';
import type { Role } from '@logirest/shared-types';
import type { Request } from 'express';

@Controller('kitchen-requests')
@ApiSecureController()
export class KitchenRequestsController {
  constructor(private readonly krService: KitchenRequestsService) {}

  @Post()
  @Idempotent()
  @ApiIdempotentHeader()
  async create(
    @Body()
    body: {
      departmentId: string;
      warehouseId: string;
      items: Array<{ itemId: string; quantityRequested: number }>;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.krService.create(body, userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.krService.findOne(id);
  }

  @Post(':id/submit')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'kitchen_request',
    action: 'SUBMIT',
    modelName: 'kitchenRequest',
  })
  @HttpCode(HttpStatus.OK)
  async submit(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body() body: { comments?: string; version?: number },
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    return this.krService.submit(id, userId, role, {
      ...body,
      ipAddress,
    });
  }

  @Post(':id/fulfill')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'kitchen_request',
    action: 'FULFILL',
    modelName: 'kitchenRequest',
  })
  @HttpCode(HttpStatus.OK)
  async fulfill(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body()
    body: {
      comments?: string;
      version?: number;
      fulfillments?: Array<{ itemId: string; fulfilledQty: number }>;
    },
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    return this.krService.fulfill(id, userId, role, {
      ...body,
      ipAddress,
    });
  }

  @Post(':id/cancel')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'kitchen_request',
    action: 'CANCEL',
    modelName: 'kitchenRequest',
  })
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body() body: { comments?: string; version?: number },
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    return this.krService.cancel(id, userId, role, {
      ...body,
      ipAddress,
    });
  }
}
