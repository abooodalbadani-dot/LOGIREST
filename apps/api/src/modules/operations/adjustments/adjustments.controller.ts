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

function mapAdjustmentDetail(adj: Record<string, unknown>) {
  const rawLines = (adj.lines as Record<string, unknown>[]) || [];
  const lines = rawLines.map((line: Record<string, unknown>) => {
    const item = line.item as Record<string, unknown> | undefined;
    return {
      id: line.id as string,
      item: item
        ? {
            id: item.id as string,
            code: item.sku as string,
            nameAr: item.name as string,
            nameEn: item.name as string,
            primaryUom: item.unitOfMeasure
              ? {
                  id: (item.unitOfMeasure as Record<string, unknown>)
                    .id as string,
                  code: (item.unitOfMeasure as Record<string, unknown>)
                    .code as string,
                }
              : { id: '', code: '' },
          }
        : {
            id: '',
            code: '',
            nameAr: '',
            nameEn: '',
            primaryUom: { id: '', code: '' },
          },
      direction: line.direction === 'IN' ? 'INCREASE' : 'DECREASE',
      qtyBefore: 0,
      qtyAdjusted: Number(line.quantity),
      uomId: (item?.uomId as string) || '',
      unitCost: line.unitCost ? Number(line.unitCost) : null,
      reasonNotes: (line.reason as string) || '',
      lotAllocations: line.lotId
        ? [{ lotId: line.lotId as string, qty: Number(line.quantity) }]
        : [],
    };
  });

  const mainReason = (rawLines[0]?.reason as string) || 'CORRECTION';
  const createdAtVal = adj.createdAt as Date | string | number | undefined;
  const createdAtIso = createdAtVal
    ? (createdAtVal instanceof Date
        ? createdAtVal
        : new Date(createdAtVal)
      ).toISOString()
    : new Date().toISOString();

  const warehouse = adj.warehouse as Record<string, unknown> | null;

  return {
    id: adj.id as string,
    documentNumber: adj.adjustmentNumber as string,
    status: adj.status as string,
    warehouseId: adj.warehouseId as string,
    warehouseName: (warehouse?.name as string) || '',
    reason: mainReason,
    notes: '',
    reject: null,
    movementId: null,
    approvedBy: null,
    postedAt:
      adj.status === 'POSTED' && createdAtVal
        ? (createdAtVal instanceof Date
            ? createdAtVal
            : new Date(createdAtVal)
          ).toISOString()
        : null,
    createdAt: createdAtIso,
    updatedAt: createdAtIso,
    version: adj.version as number,
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
      warehouseId?: string;
      reason?: string;
      notes?: string;
      lines?: Array<{
        id?: string;
        itemId?: string;
        qty?: number;
        uomId?: string;
        direction?: 'INCREASE' | 'DECREASE';
        unitCost?: number | null;
        lotId?: string | null;
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

    const lines = body.lines?.map((line) => ({
      id: line.id,
      itemId: line.itemId ?? '',
      qty: Number(line.qty),
      direction: line.direction as 'INCREASE' | 'DECREASE',
      unitCost: line.unitCost,
      lotId: line.lotId,
    }));

    const adj = await this.adjustmentsService.update(id, {
      version: body.version,
      warehouseId: body.warehouseId,
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
