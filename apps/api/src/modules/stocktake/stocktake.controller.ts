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
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { StocktakePostService } from './stocktake-post.service';
import { StocktakeService } from './stocktake.service';
import { WorkflowStateGuard } from '../../guards/workflow-state.guard';
import { WorkflowAction } from '../../decorators/workflow-action.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ActiveScope } from '../../auth/decorators/active-scope.decorator';
import { Idempotent } from '../../decorators/idempotent.decorator';
import {
  ApiSecureController,
  ApiIdempotentHeader,
} from '../../decorators/swagger-docs.decorator';
import { Role } from '@prisma/client';
import { ScopeValidationService } from '../../auth/scope-validation.service';
import { PrismaService } from '../../database/prisma.service';
import type { Request } from 'express';

function mapStocktakeDetail(session: any) {
  const items = (session.snapshots || []).map((snapshot: any) => {
    const count = (session.counts || []).find(
      (c: any) => c.itemId === snapshot.itemId && c.lotId === snapshot.lotId,
    );

    const countedQty = count ? Number(count.qtyCounted) : null;
    const snapshotQty = Number(snapshot.qtySnapshot);
    const variance = countedQty !== null ? countedQty - snapshotQty : null;

    return {
      id: snapshot.id,
      item_id: snapshot.itemId,
      item_name: snapshot.item?.name || '',
      barcode: snapshot.item?.barcodeMappings?.[0]?.barcode || '',
      uom: snapshot.item?.unitOfMeasure?.code || 'PCS',
      snapshot_qty: snapshotQty,
      counted_qty: countedQty,
      variance: variance,
      variance_reason: null,
      lot_number: snapshot.lot?.lotNumber || undefined,
      expiry_date: snapshot.lot?.expiryDate
        ? snapshot.lot.expiryDate.toISOString()
        : undefined,
      unit_cost: Number(snapshot.wacSnapshot),
    };
  });

  return {
    id: session.id,
    session_number: session.sessionNumber,
    session_name: `Stocktake ${session.sessionNumber}`,
    warehouse_id: session.warehouseId,
    warehouse_name: session.warehouse?.name || '',
    status: session.status,
    snapshot_at: session.createdAt
      ? (session.createdAt instanceof Date
          ? session.createdAt
          : new Date(session.createdAt)
        ).toISOString()
      : new Date().toISOString(),
    started_by: 'System',
    started_at: session.createdAt
      ? (session.createdAt instanceof Date
          ? session.createdAt
          : new Date(session.createdAt)
        ).toISOString()
      : new Date().toISOString(),
    posted_at:
      session.status === 'POSTED' && session.createdAt
        ? (session.createdAt instanceof Date
            ? session.createdAt
            : new Date(session.createdAt)
          ).toISOString()
        : null,
    posted_by: null,
    items,
    version: session.version,
    description: '',
    approver_comment: '',
    approved_at: undefined,
    created_at: session.createdAt
      ? (session.createdAt instanceof Date
          ? session.createdAt
          : new Date(session.createdAt)
        ).toISOString()
      : new Date().toISOString(),
    updated_at: session.createdAt
      ? (session.createdAt instanceof Date
          ? session.createdAt
          : new Date(session.createdAt)
        ).toISOString()
      : new Date().toISOString(),
    audit_log: [],
  };
}

@Controller('stocktake/sessions')
@ApiSecureController()
export class StocktakeController {
  constructor(
    private readonly stocktakeService: StocktakeService,
    private readonly stocktakePostService: StocktakePostService,
    private readonly scopeValidationService: ScopeValidationService,
    private readonly prisma: PrismaService,
  ) {}

  private async validateSessionScope(
    sessionId: string,
    activeWarehouseId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const session = await tx.stocktakeSession.findUnique({
        where: { id: sessionId },
        select: { warehouseId: true },
      });
      if (!session) {
        throw new BadRequestException(
          `StocktakeSession with ID ${sessionId} not found`,
        );
      }
      if (session.warehouseId !== activeWarehouseId) {
        throw new ForbiddenException('WAREHOUSE_SCOPE_VIOLATION');
      }
    });
  }

  @Post()
  @Idempotent()
  @ApiIdempotentHeader()
  async create(
    @Body() body: { warehouseId?: string; warehouse_id?: string },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    const warehouseId = body.warehouseId || body.warehouse_id;
    if (!warehouseId) {
      throw new BadRequestException('warehouseId is required');
    }
    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      warehouseId,
    );
    const session = await this.stocktakeService.create({ warehouseId }, userId);
    return mapStocktakeDetail(await this.stocktakeService.findOne(session.id));
  }

  @Get()
  async findAll(
    @Query() query: { status?: string; search?: string; page?: string },
    @ActiveScope('warehouseId') warehouseId?: string,
  ) {
    const result = await this.stocktakeService.findAll(
      {
        status: query.status,
        search: query.search,
        page: query.page ? Number(query.page) : 1,
      },
      warehouseId,
    );

    return {
      data: result.data.map(mapStocktakeDetail),
      meta: result.meta,
    };
  }

  @Get('summary')
  async getSummary(@ActiveScope('warehouseId') warehouseId?: string) {
    return this.stocktakeService.getSummary(warehouseId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    const session = await this.stocktakeService.findOne(id);
    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      session.warehouseId,
    );
    return mapStocktakeDetail(session);
  }

  @Put(':stocktakeId/items/:lineId')
  async updateLineItem(
    @Param('stocktakeId') stocktakeId: string,
    @Param('lineId') lineId: string,
    @Body()
    body: {
      counted_qty?: number;
      countedQty?: number;
      variance_reason?: string;
      varianceReason?: string;
    },
    @CurrentUser('id') userId: string,
    @ActiveScope('warehouseId') activeWarehouseId: string,
  ) {
    await this.validateSessionScope(stocktakeId, activeWarehouseId);
    const counted_qty =
      body.countedQty !== undefined ? body.countedQty : body.counted_qty;
    if (counted_qty === undefined) {
      throw new Error('counted_qty is required');
    }
    const session = await this.stocktakeService.updateLineItem(
      stocktakeId,
      lineId,
      {
        counted_qty,
        variance_reason: body.varianceReason || body.variance_reason,
      },
      userId,
    );
    return mapStocktakeDetail(session);
  }

  @Put(':sessionId/counts/:countId')
  async updateCountAlias(
    @Param('sessionId') sessionId: string,
    @Param('countId') countId: string,
    @Body()
    body: {
      counted_qty?: number;
      countedQty?: number;
      variance_reason?: string;
      varianceReason?: string;
    },
    @CurrentUser('id') userId: string,
    @ActiveScope('warehouseId') activeWarehouseId: string,
  ) {
    await this.validateSessionScope(sessionId, activeWarehouseId);
    const counted_qty =
      body.countedQty !== undefined ? body.countedQty : body.counted_qty;
    if (counted_qty === undefined) {
      throw new Error('counted_qty is required');
    }
    const session = await this.stocktakeService.updateLineItem(
      sessionId,
      countId,
      {
        counted_qty,
        variance_reason: body.varianceReason || body.variance_reason,
      },
      userId,
    );
    return mapStocktakeDetail(session);
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

    const session = await this.stocktakeService.start(id, userId, role, {
      ...body,
      ipAddress,
    });
    return mapStocktakeDetail(session);
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
    @ActiveScope('warehouseId') activeWarehouseId: string,
  ) {
    await this.validateSessionScope(id, activeWarehouseId);
    await this.stocktakeService.count(id, body.counts, userId);
    return mapStocktakeDetail(await this.stocktakeService.findOne(id));
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

    const session = await this.stocktakeService.submit(id, userId, role, {
      ...body,
      ipAddress,
    });
    return mapStocktakeDetail(session);
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
    @Body() body: { comments?: string; comment?: string; version?: number },
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    const session = await this.stocktakeService.approve(id, userId, role, {
      comments: body.comments || body.comment,
      version: body.version,
      ipAddress,
    });
    return mapStocktakeDetail(session);
  }

  @Post(':id/reject')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'stocktake',
    action: 'REJECT',
    modelName: 'stocktakeSession',
  })
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body() body: { comments?: string; comment?: string; version?: number },
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    const session = await this.stocktakeService.reject(id, userId, role, {
      comments: body.comments || body.comment,
      version: body.version,
      ipAddress,
    });
    return mapStocktakeDetail(session);
  }

  @Post(':id/recount')
  @HttpCode(HttpStatus.OK)
  async recount(
    @Param('id') id: string,
    @Body()
    body: { item_ids?: string[]; itemIds?: string[] | null; version?: number },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @ActiveScope('warehouseId') activeWarehouseId: string,
    @Req() req: Request,
  ) {
    await this.validateSessionScope(id, activeWarehouseId);
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    const session = await this.stocktakeService.recount(
      id,
      {
        item_ids: body.itemIds || body.item_ids || [],
        version: body.version,
        ipAddress,
      },
      userId,
      role,
    );
    return mapStocktakeDetail(session);
  }

  @Post(':id/review_variance')
  @HttpCode(HttpStatus.OK)
  async reviewVariance(
    @Param('id') id: string,
    @Body()
    body: {
      items: Array<{ line_id: string; variance_reason?: string }>;
      version?: number;
    },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @ActiveScope('warehouseId') activeWarehouseId: string,
    @Req() req: Request,
  ) {
    await this.validateSessionScope(id, activeWarehouseId);
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    const session = await this.stocktakeService.reviewVariance(
      id,
      {
        items: body.items,
        version: body.version,
        ipAddress,
      },
      userId,
      role,
    );
    return mapStocktakeDetail(session);
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
    @Body() body: { comments?: string; reason?: string; version?: number },
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    const session = await this.stocktakeService.cancel(id, userId, role, {
      comments: body.comments || body.reason,
      version: body.version,
      ipAddress,
    });
    return mapStocktakeDetail(session);
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

    const session = await this.stocktakePostService.post(
      id,
      userId,
      role,
      body.version,
      ipAddress,
    );
    return mapStocktakeDetail(session);
  }
}
