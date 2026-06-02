import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdjustmentPostService } from '../adjustment-post.service';
import { AdjustmentsService } from './adjustments.service';
import { WorkflowStateGuard } from '../../../guards/workflow-state.guard';
import { WorkflowAction } from '../../../decorators/workflow-action.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ActiveScope } from '../../../auth/decorators/active-scope.decorator';
import { Idempotent } from '../../../decorators/idempotent.decorator';
import {
  ApiSecureController,
  ApiIdempotentHeader,
} from '../../../decorators/swagger-docs.decorator';
import { AdjustmentDirection, AdjustmentReason, Role } from '@prisma/client';
import { ScopeValidationService } from '../../../auth/scope-validation.service';
import { PrismaService } from '../../../database/prisma.service';
import { Roles } from '../../../auth/decorators/roles.decorator';
import type { Request } from 'express';

function mapAdjustmentDetail(adj: any) {
  const lines = (adj.lines || []).map((line: any) => ({
    id: line.id,
    item: line.item
      ? {
          id: line.item.id,
          code: line.item.sku,
          name_ar: line.item.name,
          name_en: line.item.name,
          primary_uom: line.item.unitOfMeasure
            ? {
                id: line.item.unitOfMeasure.id,
                code: line.item.unitOfMeasure.code,
              }
            : { id: '', code: '' },
        }
      : {
          id: '',
          code: '',
          name_ar: '',
          name_en: '',
          primary_uom: { id: '', code: '' },
        },
    direction: line.direction === 'IN' ? 'INCREASE' : 'DECREASE',
    qty_before: 0,
    qty_adjusted: Number(line.quantity),
    uom_id: line.item?.uomId || '',
    unit_cost: line.unitCost ? Number(line.unitCost) : null,
    reason_notes: line.reason || '',
    lot_allocations: line.lotId
      ? [{ lot_id: line.lotId, qty: Number(line.quantity) }]
      : [],
  }));

  const mainReason = adj.lines?.[0]?.reason || 'CORRECTION';

  return {
    id: adj.id,
    document_number: adj.adjustmentNumber,
    status: adj.status,
    warehouse_id: adj.warehouseId,
    reason: mainReason,
    notes: '',
    reject: null,
    movement_id: null,
    approved_by: null,
    posted_at:
      adj.status === 'POSTED' && adj.createdAt
        ? (adj.createdAt instanceof Date
            ? adj.createdAt
            : new Date(adj.createdAt)
          ).toISOString()
        : null,
    created_at: adj.createdAt
      ? (adj.createdAt instanceof Date
          ? adj.createdAt
          : new Date(adj.createdAt)
        ).toISOString()
      : new Date().toISOString(),
    updated_at: adj.createdAt
      ? (adj.createdAt instanceof Date
          ? adj.createdAt
          : new Date(adj.createdAt)
        ).toISOString()
      : new Date().toISOString(),
    version: adj.version,
    lines,
    timeline: [],
  };
}

@Controller('operations/adjustments')
@ApiSecureController()
export class AdjustmentsController {
  constructor(
    private readonly adjPostService: AdjustmentPostService,
    private readonly adjustmentsService: AdjustmentsService,
    private readonly scopeValidationService: ScopeValidationService,
    private readonly prisma: PrismaService,
  ) {}

  @Throttle({ short: { limit: 50, ttl: 1000 } })
  @Post()
  @Idempotent()
  @ApiIdempotentHeader()
  async create(
    @Body()
    body: {
      warehouseId: string;
      lines: Array<{
        itemId: string;
        lotId?: string;
        quantity: number;
        direction: AdjustmentDirection;
        reason: AdjustmentReason;
        unitCost?: number;
      }>;
    },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      body.warehouseId,
    );
    const adj = await this.adjustmentsService.create(body, userId);
    return mapAdjustmentDetail(adj);
  }

  @Get()
  async findAll(
    @Query() query: { status?: string; search?: string; page?: string },
    @ActiveScope('warehouseId') warehouseId?: string,
  ) {
    const result = await this.adjustmentsService.findAll(
      {
        status: query.status,
        search: query.search,
        page: query.page ? Number(query.page) : 1,
      },
      warehouseId,
    );

    return {
      data: result.data.map(mapAdjustmentDetail),
      meta: result.meta,
    };
  }

  @Get('summary')
  async getSummary(@ActiveScope('warehouseId') warehouseId?: string) {
    return this.adjustmentsService.getSummary(warehouseId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    const adj = await this.adjustmentsService.findOne(id);
    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      adj.warehouseId,
    );
    return mapAdjustmentDetail(adj);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.INV_MGR, Role.STORE_MGR)
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body()
    body: {
      version: number;
      warehouse_id?: string;
      warehouseId?: string;
      reason?: string;
      notes?: string;
      lines?: Array<{
        id?: string;
        item_id: string;
        itemId?: string;
        qty: number;
        uom_id: string;
        direction: 'INCREASE' | 'DECREASE';
        unit_cost?: number | null;
        unitCost?: number | null;
        lotId?: string | null;
        lot_id?: string | null;
      }>;
    },
  ) {
    const adjustment = await this.prisma.adjustment.findUnique({
      where: { id },
      select: { warehouseId: true },
    });
    if (adjustment) {
      await this.scopeValidationService.validateWarehouse(
        userId,
        role,
        adjustment.warehouseId,
      );
    }

    const warehouseId = body.warehouseId || body.warehouse_id;
    const lines = body.lines?.map((line) => ({
      id: line.id,
      itemId: line.itemId || line.item_id,
      qty: line.qty,
      direction: line.direction,
      unitCost: line.unitCost !== undefined ? line.unitCost : line.unit_cost,
      lotId: line.lotId !== undefined ? line.lotId : line.lot_id,
    }));

    const adj = await this.adjustmentsService.update(id, {
      version: body.version,
      warehouseId,
      reason: body.reason,
      notes: body.notes,
      lines,
    });
    return mapAdjustmentDetail(adj);
  }

  @Post(':id/edit')
  @HttpCode(HttpStatus.OK)
  async edit(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body() body: { version: number },
    @Req() req: Request,
  ) {
    const adjustment = await this.prisma.adjustment.findUnique({
      where: { id },
      select: { warehouseId: true },
    });
    if (adjustment) {
      await this.scopeValidationService.validateWarehouse(
        userId,
        role,
        adjustment.warehouseId,
      );
    }

    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    const adj = await this.adjustmentsService.edit(id, userId, role, {
      version: body.version,
      ipAddress,
    });
    return mapAdjustmentDetail(adj);
  }

  @Post(':id/submit')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'adjustment',
    action: 'SUBMIT',
    modelName: 'adjustment',
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

    const adj = await this.adjustmentsService.submit(id, userId, role, {
      ...body,
      ipAddress,
    });
    return mapAdjustmentDetail(adj);
  }

  @Post(':id/approve')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'adjustment',
    action: 'APPROVE',
    modelName: 'adjustment',
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

    const adj = await this.adjustmentsService.approve(id, userId, role, {
      ...body,
      ipAddress,
    });
    return mapAdjustmentDetail(adj);
  }

  @Post(':id/reject')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'adjustment',
    action: 'REJECT',
    modelName: 'adjustment',
  })
  @HttpCode(HttpStatus.OK)
  async reject(
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

    const adj = await this.adjustmentsService.reject(id, userId, role, {
      ...body,
      ipAddress,
    });
    return mapAdjustmentDetail(adj);
  }

  @Post(':id/cancel')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'adjustment',
    action: 'CANCEL',
    modelName: 'adjustment',
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

    const adj = await this.adjustmentsService.cancel(id, userId, role, {
      ...body,
      ipAddress,
    });
    return mapAdjustmentDetail(adj);
  }

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

    const adj = await this.adjPostService.post(
      id,
      userId,
      role,
      body.version,
      ipAddress,
    );
    return mapAdjustmentDetail(adj);
  }
}
