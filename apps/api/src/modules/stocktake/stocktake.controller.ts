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
import { StocktakePostService } from './stocktake-post.service';
import { StocktakeService } from './stocktake.service';
import { WorkflowStateGuard } from '../../guards/workflow-state.guard';
import { WorkflowAction } from '../../decorators/workflow-action.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Idempotent } from '../../decorators/idempotent.decorator';
import type { Role } from '@logirest/shared-types';
import type { Request } from 'express';

@Controller('stocktake/sessions')
export class StocktakeController {
  constructor(
    private readonly stocktakeService: StocktakeService,
    private readonly stocktakePostService: StocktakePostService,
  ) {}

  @Post()
  @Idempotent()
  async create(
    @Body() body: { warehouseId: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.stocktakeService.create(body, userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.stocktakeService.findOne(id);
  }

  @Post(':id/start')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'stocktake',
    action: 'START',
    modelName: 'stocktakeSession',
  })
  @HttpCode(HttpStatus.OK)
  async start(
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

    return this.stocktakeService.start(id, userId, role, {
      ...body,
      ipAddress,
    });
  }

  @Post(':id/count')
  @HttpCode(HttpStatus.OK)
  async count(
    @Param('id') id: string,
    @Body()
    body: {
      counts: Array<{ itemId: string; lotId?: string; qtyCounted: number }>;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.stocktakeService.count(id, body.counts, userId);
  }

  @Post(':id/submit')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'stocktake',
    action: 'SUBMIT',
    modelName: 'stocktakeSession',
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

    return this.stocktakeService.submit(id, userId, role, {
      ...body,
      ipAddress,
    });
  }

  @Post(':id/approve')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'stocktake',
    action: 'APPROVE',
    modelName: 'stocktakeSession',
  })
  @HttpCode(HttpStatus.OK)
  async approve(
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

    return this.stocktakeService.approve(id, userId, role, {
      ...body,
      ipAddress,
    });
  }

  @Post(':id/cancel')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'stocktake',
    action: 'CANCEL',
    modelName: 'stocktakeSession',
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

    return this.stocktakeService.cancel(id, userId, role, {
      ...body,
      ipAddress,
    });
  }

  @Post(':id/post')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'stocktake',
    action: 'POST',
    modelName: 'stocktakeSession',
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

    return this.stocktakePostService.post(
      id,
      userId,
      role,
      body.version,
      ipAddress,
    );
  }
}
