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
  Res,
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
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { PdfGeneratorService } from '../../pdf/pdf-generator.service';
import type { Request, Response } from 'express';

interface UomDetail {
  id: string;
  code: string;
}

interface ItemDetail {
  id: string;
  sku: string;
  name: string;
  uomId?: string | null;
  unitOfMeasure?: UomDetail | null;
  image?: string | null;
}

interface AdjustmentLineWithRelations {
  id: string;
  itemId: string;
  lotId?: string | null;
  quantity: number | string | unknown;
  direction: string;
  reason: string;
  unitCost?: number | string | unknown | null;
  item?: ItemDetail | null;
}

interface ApprovalEventDetail {
  actionPerformed: string;
  userRole: string;
  user?: { name: string } | null;
}

interface AdjustmentWithRelations {
  id?: string | null;
  adjustmentNumber?: string | null;
  status?: string | null;
  warehouseId?: string | null;
  notes?: string | null;
  version?: number | null;
  createdAt?: Date | string | number | null;
  postedAt?: Date | string | number | null;
  createdBy?: { name: string; email: string } | null;
  warehouse?: { name: string } | null;
  lines?: AdjustmentLineWithRelations[];
  approvalEvents?: ApprovalEventDetail[];
}

function mapAdjustmentDetail(adj: AdjustmentWithRelations) {
  const rawLines = adj.lines || [];
  const lines = rawLines.map((line) => {
    const item = line.item;
    return {
      id: line.id,
      item: item
        ? {
            id: item.id,
            code: item.sku,
            nameAr: item.name,
            nameEn: item.name,
            image: item.image || null,
            primaryUom: item.unitOfMeasure
              ? {
                  id: item.unitOfMeasure.id,
                  code: item.unitOfMeasure.code,
                }
              : { id: '', code: '' },
          }
        : {
            id: '',
            code: '',
            nameAr: '',
            nameEn: '',
            image: null,
            primaryUom: { id: '', code: '' },
          },
      direction: line.direction === 'IN' ? 'INCREASE' : 'DECREASE',
      qtyBefore: 0,
      qtyAdjusted: Number(line.quantity),
      uomId: item?.uomId || '',
      unitCost: line.unitCost ? Number(line.unitCost) : null,
      reasonNotes: line.reason || '',
      lotAllocations: line.lotId
        ? [{ lotId: line.lotId, qty: Number(line.quantity) }]
        : [],
    };
  });

  const mainReason = rawLines[0]?.reason || 'CORRECTION';
  const createdAtVal = adj.createdAt;
  const createdAtIso = createdAtVal
    ? (createdAtVal instanceof Date
        ? createdAtVal
        : new Date(createdAtVal)
      ).toISOString()
    : new Date().toISOString();

  const warehouse = adj.warehouse;

  return {
    id: adj.id || '',
    documentNumber: adj.adjustmentNumber || '',
    status: adj.status || '',
    warehouseId: adj.warehouseId || '',
    warehouseName: warehouse?.name || '',
    reason: mainReason,
    notes: adj.notes || '',
    createdBy: adj.createdBy?.name || 'System',
    reject: null,
    movementId: null,
    approvedBy: (() => {
      const events = adj.approvalEvents || [];
      const approvalEvent = events.find(
        (e) => e.actionPerformed === 'APPROVE' || e.actionPerformed === 'POST',
      );
      return approvalEvent?.user?.name || approvalEvent?.userRole || null;
    })(),
    postedAt: adj.postedAt
      ? (adj.postedAt instanceof Date
          ? adj.postedAt
          : new Date(adj.postedAt)
        ).toISOString()
      : null,
    createdAt: createdAtIso,
    updatedAt: createdAtIso,
    version: adj.version || 1,
    lines,
    timeline: [],
  };
}

@Controller('operations/adjustments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecureController()
export class AdjustmentsController {
  constructor(
    private readonly adjPostService: AdjustmentPostService,
    private readonly adjustmentsService: AdjustmentsService,
    private readonly scopeValidationService: ScopeValidationService,
    private readonly prisma: PrismaService,
    private readonly pdfGeneratorService: PdfGeneratorService,
  ) {}

  @Throttle({ short: { limit: 50, ttl: 1000 } })
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

    const adjustmentIds = result.data.map((item) => item.id);
    const events = await this.prisma.approvalEvent.findMany({
      where: {
        documentType: 'ADJUSTMENT',
        documentId: { in: adjustmentIds },
        actionPerformed: { in: ['APPROVE', 'POST'] },
      },
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const mappedData = result.data.map((item) => {
      const itemEvents = events.filter((e) => e.documentId === item.id);
      return mapAdjustmentDetail({
        ...item,
        approvalEvents: itemEvents,
      });
    });

    return {
      data: mappedData,
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

  @Get(':id/pdf')
  async getPdf(
    @Param('id') id: string,
    @Query('locale') locale: 'ar' | 'en' = 'en',
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Res() res: Response,
  ) {
    const adj = await this.adjustmentsService.findOne(id);
    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      adj.warehouseId,
    );

    const buffer = await this.pdfGeneratorService.generateAdjustmentPdf(
      id,
      locale,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=ADJUSTMENT_${adj.adjustmentNumber}.pdf`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Put(':id')
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.WH_KEEPER,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
  )
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
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.WH_KEEPER,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
  )
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
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.WH_KEEPER,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
  )
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
  @Roles(
    Role.ADMIN,
    Role.GM,
    Role.INV_MGR,
    Role.APPROVER,
    Role.BRANCH_MGR,
    Role.STORE_MGR,
  )
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
  @Roles(
    Role.ADMIN,
    Role.GM,
    Role.INV_MGR,
    Role.APPROVER,
    Role.BRANCH_MGR,
    Role.STORE_MGR,
  )
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
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.WH_KEEPER,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
  )
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
  @Roles(Role.ADMIN, Role.INV_MGR, Role.BRANCH_MGR)
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
