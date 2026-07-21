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
  Res,
} from '@nestjs/common';
import { StocktakePostService } from './stocktake-post.service';
import { PdfGeneratorService } from '../pdf/pdf-generator.service';
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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ScopeValidationService } from '../../auth/scope-validation.service';
import { PrismaService } from '../../database/prisma.service';
import type { Request, Response } from 'express';

function safeIsoString(val: unknown): string | undefined {
  if (!val) return undefined;
  const d = val instanceof Date ? val : new Date(val as string);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

function mapStocktakeDetail(session: Record<string, unknown>) {
  const counts = (session?.counts as Record<string, unknown>[]) || [];
  const snapshots = (session?.snapshots as Record<string, unknown>[]) || [];
  const warehouse = session?.warehouse as Record<string, unknown> | null;
  const sessionNumber = (session?.sessionNumber as string) || '';

  const items = snapshots.map((snapshot: Record<string, unknown>) => {
    const item = snapshot?.item as Record<string, unknown> | null;
    const lot = snapshot?.lot as Record<string, unknown> | null;
    const barcodeMappings =
      (item?.barcodeMappings as Record<string, unknown>[]) || [];
    const unitOfMeasure = item?.unitOfMeasure as Record<string, unknown> | null;

    const count = counts.find(
      (c: Record<string, unknown>) =>
        c && c.itemId === snapshot?.itemId && c.lotId === snapshot?.lotId,
    );

    const countedQty = count ? Number(count.qtyCounted) : null;
    const snapshotQty = snapshot ? Number(snapshot.qtySnapshot) : 0;
    const variance = countedQty !== null ? countedQty - snapshotQty : null;

    return {
      id: (snapshot?.id as string) || '',
      itemId: (snapshot?.itemId as string) || '',
      itemName: (item?.name as string) || '',
      barcode: (barcodeMappings[0]?.barcode as string) || '',
      uom: (unitOfMeasure?.code as string) || 'PCS',
      snapshotQty: snapshotQty,
      countedQty: countedQty,
      variance: variance,
      varianceReason: null,
      lotNumber: (lot?.lotNumber as string) || undefined,
      expiryDate: safeIsoString(lot?.expiryDate),
      unitCost: snapshot ? Number(snapshot.wacSnapshot) : 0,
      image: (item?.image as string) || null,
    };
  });

  const totalItems = snapshots.length;
  const countedItems = counts.length;

  return {
    id: (session?.id as string) || '',
    sessionNumber,
    sessionName: `Stocktake ${sessionNumber}`,
    warehouseId: (session?.warehouseId as string) || '',
    warehouseName: (warehouse?.name as string) || '',
    status: (session?.status as string) || 'DRAFT',
    snapshotAt: safeIsoString(session?.createdAt) || new Date().toISOString(),
    startedBy: 'System',
    startedAt: safeIsoString(session?.createdAt) || new Date().toISOString(),
    postedAt:
      session?.status === 'POSTED' && session?.createdAt
        ? safeIsoString(session.createdAt) || null
        : null,
    postedBy: null,
    items,
    totalItems,
    countedItems,
    version: typeof session?.version === 'number' ? session.version : 1,
    description: '',
    approverComment: '',
    approvedAt: undefined,
    createdAt: safeIsoString(session?.createdAt) || new Date().toISOString(),
    updatedAt:
      safeIsoString(session?.updatedAt || session?.createdAt) ||
      new Date().toISOString(),
    auditLog: [],
  };
}

@Controller('stocktake/sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  Role.ADMIN,
  Role.GM,
  Role.INV_MGR,
  Role.WH_KEEPER,
  Role.STORE_MGR,
  Role.APPROVER,
  Role.AUDITOR,
  Role.VIEWER,
  Role.BRANCH_MGR,
)
@ApiSecureController()
export class StocktakeController {
  constructor(
    private readonly stocktakeService: StocktakeService,
    private readonly stocktakePostService: StocktakePostService,
    private readonly scopeValidationService: ScopeValidationService,
    private readonly prisma: PrismaService,
    private readonly pdfGeneratorService: PdfGeneratorService,
  ) {}

  private async validateSessionScope(
    sessionId: string,
    activeWarehouseId: string,
    role?: Role,
  ): Promise<void> {
    if (role === Role.ADMIN || role === Role.GM) {
      return;
    }
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
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.WH_KEEPER,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
  )
  @Idempotent()
  @ApiIdempotentHeader()
  async create(
    @Body() body: { warehouseId: string },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    const warehouseId = body.warehouseId;
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
    @Query() query: { status?: string; search?: string; page?: string; limit?: string },
    @ActiveScope('warehouseId') warehouseId?: string,
  ) {
    const result = await this.stocktakeService.findAll(
      {
        status: query.status,
        search: query.search,
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 20,
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

  @Get(':id/pdf')
  async getPdf(
    @Param('id') id: string,
    @Query('locale') locale: 'ar' | 'en' = 'en',
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Res() res: Response,
  ) {
    const session = await this.stocktakeService.findOne(id);
    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      session.warehouseId,
    );

    const buffer = await this.pdfGeneratorService.generateStocktakePdf(
      id,
      locale,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=STOCKTAKE_${session.sessionNumber}.pdf`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Put(':stocktakeId/items/:lineId')
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.WH_KEEPER,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
  )
  async updateLineItem(
    @Param('stocktakeId') stocktakeId: string,
    @Param('lineId') lineId: string,
    @Body()
    body: {
      countedQty: number;
      varianceReason?: string;
    },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @ActiveScope('warehouseId') activeWarehouseId: string,
  ) {
    await this.validateSessionScope(stocktakeId, activeWarehouseId, role);
    const counted_qty = body.countedQty;
    if (counted_qty === undefined) {
      throw new BadRequestException('countedQty is required');
    }
    const session = await this.stocktakeService.updateLineItem(
      stocktakeId,
      lineId,
      {
        counted_qty,
        variance_reason: body.varianceReason,
      },
      userId,
    );
    return mapStocktakeDetail(session);
  }

  @Put(':sessionId/counts/:countId')
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.WH_KEEPER,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
  )
  async updateCountAlias(
    @Param('sessionId') sessionId: string,
    @Param('countId') countId: string,
    @Body()
    body: {
      countedQty: number;
      varianceReason?: string;
    },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @ActiveScope('warehouseId') activeWarehouseId: string,
  ) {
    await this.validateSessionScope(sessionId, activeWarehouseId, role);
    const counted_qty = body.countedQty;
    if (counted_qty === undefined) {
      throw new BadRequestException('countedQty is required');
    }
    const session = await this.stocktakeService.updateLineItem(
      sessionId,
      countId,
      {
        counted_qty,
        variance_reason: body.varianceReason,
      },
      userId,
    );
    return mapStocktakeDetail(session);
  }

  @Post(':id/start')
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.WH_KEEPER,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
  )
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
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.WH_KEEPER,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
  )
  @HttpCode(HttpStatus.OK)
  async count(
    @Param('id') id: string,
    @Body()
    body: {
      counts: Array<{ itemId: string; lotId?: string; qtyCounted: number }>;
    },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @ActiveScope('warehouseId') activeWarehouseId: string,
  ) {
    await this.validateSessionScope(id, activeWarehouseId, role);
    await this.stocktakeService.count(id, body?.counts ?? [], userId);
    return mapStocktakeDetail(await this.stocktakeService.findOne(id));
  }

  @Post(':id/submit')
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.WH_KEEPER,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
  )
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
  @Roles(Role.ADMIN, Role.GM, Role.INV_MGR, Role.APPROVER, Role.BRANCH_MGR)
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
  @Roles(Role.ADMIN, Role.GM, Role.INV_MGR, Role.APPROVER, Role.BRANCH_MGR)
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
  @Roles(Role.ADMIN, Role.INV_MGR)
  @HttpCode(HttpStatus.OK)
  async recount(
    @Param('id') id: string,
    @Body()
    body: { itemIds: string[]; version?: number },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @ActiveScope('warehouseId') activeWarehouseId: string,
    @Req() req: Request,
  ) {
    await this.validateSessionScope(id, activeWarehouseId, role);
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    const session = await this.stocktakeService.recount(
      id,
      {
        item_ids: body.itemIds || [],
        version: body.version,
        ipAddress,
      },
      userId,
      role,
    );
    return mapStocktakeDetail(session);
  }

  @Post(':id/review_variance')
  @Roles(Role.ADMIN, Role.INV_MGR, Role.STORE_MGR, Role.BRANCH_MGR)
  @HttpCode(HttpStatus.OK)
  async reviewVariance(
    @Param('id') id: string,
    @Body()
    body: {
      items: Array<{ lineId: string; varianceReason?: string }>;
      version?: number;
    },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @ActiveScope('warehouseId') activeWarehouseId: string,
    @Req() req: Request,
  ) {
    await this.validateSessionScope(id, activeWarehouseId, role);
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    const session = await this.stocktakeService.reviewVariance(
      id,
      {
        items: (body.items || []).map((i) => ({
          line_id: i.lineId,
          variance_reason: i.varianceReason,
        })),
        version: body.version,
        ipAddress,
      },
      userId,
      role,
    );
    return mapStocktakeDetail(session);
  }

  @Post(':id/cancel')
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.WH_KEEPER,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
  )
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
  @Roles(Role.ADMIN, Role.INV_MGR, Role.BRANCH_MGR)
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
