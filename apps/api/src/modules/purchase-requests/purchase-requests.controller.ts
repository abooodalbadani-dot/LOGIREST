import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PurchaseRequestsService } from './purchase-requests.service';
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
import { Roles } from '../../auth/decorators/roles.decorator';
import type { Request } from 'express';

function mapPRDetail(pr: Record<string, unknown>) {
  const prLines = (pr.lines as Record<string, unknown>[]) || [];
  const createdBy = pr.createdBy as Record<string, unknown> | null;

  const lines = prLines.map((line: Record<string, unknown>) => {
    const item = line.item as Record<string, unknown> | null;
    const unitOfMeasure = item?.unitOfMeasure as Record<string, unknown> | null;

    return {
      id: line.id as string,
      item: {
        id: (item?.id as string) || '',
        code: (item?.sku as string) || '',
        name_ar: (item?.name as string) || '',
        name_en: (item?.name as string) || '',
        primary_uom: unitOfMeasure
          ? {
              id: unitOfMeasure.id as string,
              code: unitOfMeasure.code as string,
            }
          : { id: '', code: '' },
      },
      req_qty: Number(line.quantity),
      uom_id: (item?.uomId as string) || '',
    };
  });

  const createdAtIso = pr.createdAt
    ? (pr.createdAt instanceof Date
        ? pr.createdAt
        : new Date(pr.createdAt as string)
      ).toISOString()
    : new Date().toISOString();

  return {
    id: pr.id as string,
    document_number: pr.requestNumber as string,
    status: pr.status as string,
    department_id: pr.warehouseId as string, // Fallback since no department_id is stored directly
    expected_date: createdAtIso,
    version: pr.version as number,
    notes: '',
    created_at: createdAtIso,
    created_by: (createdBy?.name as string) || 'System',
    updated_at: createdAtIso,
    lines,
  };
}

function mapPRSummary(pr: Record<string, unknown>) {
  const createdAtIso = pr.createdAt
    ? (pr.createdAt instanceof Date
        ? pr.createdAt
        : new Date(pr.createdAt as string)
      ).toISOString()
    : new Date().toISOString();

  return {
    id: pr.id as string,
    document_number: pr.requestNumber as string,
    status: pr.status as string,
    department_id: pr.warehouseId as string,
    expected_date: createdAtIso,
    created_at: createdAtIso,
  };
}

@Controller('procurement/purchase-requests')
@ApiSecureController()
export class PurchaseRequestsController {
  constructor(
    private readonly prService: PurchaseRequestsService,
    private readonly scopeValidationService: ScopeValidationService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Idempotent()
  @ApiIdempotentHeader()
  async create(
    @Body()
    body: {
      branchId: string;
      warehouseId: string;
      lines: Array<{ itemId: string; quantity: number }>;
    },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      body.warehouseId,
    );
    const pr = await this.prService.create(body, userId);
    return { data: mapPRDetail(pr) };
  }

  @Get()
  async findAll(
    @Query() query: { status?: string; search?: string; page?: string },
    @ActiveScope('warehouseId') warehouseId?: string,
  ) {
    const result = await this.prService.findAll(
      {
        status: query.status,
        search: query.search,
        page: query.page ? Number(query.page) : 1,
      },
      warehouseId,
    );

    return {
      data: result.data.map(mapPRSummary),
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    const pr = await this.prService.findOne(id);
    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      pr.warehouseId,
    );
    return { data: mapPRDetail(pr) };
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.INV_MGR, Role.PROC_OFFICER)
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body()
    body: {
      version: number;
      lines?: Array<{ itemId: string; quantity: number }>;
    },
  ) {
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      select: { warehouseId: true },
    });
    if (pr) {
      await this.scopeValidationService.validateWarehouse(
        userId,
        role,
        pr.warehouseId,
      );
    }
    const lines = (body.lines as Record<string, unknown>[])?.map(
      (line: Record<string, unknown>) => ({
        itemId: String(line.itemId || line.item_id || ''),
        quantity: Number(line.quantity || line.req_qty || 0),
      }),
    );

    const updated = await this.prService.update(id, {
      version: body.version,
      lines,
    });
    return { data: mapPRDetail(updated) };
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.INV_MGR, Role.PROC_OFFICER)
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query('version') version?: string,
  ) {
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      select: { warehouseId: true },
    });
    if (pr) {
      await this.scopeValidationService.validateWarehouse(
        userId,
        role,
        pr.warehouseId,
      );
    }
    await this.prService.remove(id, version ? Number(version) : undefined);
    return { success: true };
  }

  @Post(':id/submit')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'pr',
    action: 'SUBMIT',
    modelName: 'purchaseRequest',
  })
  @HttpCode(HttpStatus.OK)
  async submit(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() body: { comments?: string; version?: number },
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;
    const pr = await this.prService.submit(id, userId, role as Role, {
      ...body,
      ipAddress,
    });
    return { data: mapPRDetail(pr) };
  }

  @Post(':id/approve')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'pr',
    action: 'APPROVE',
    modelName: 'purchaseRequest',
  })
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() body: { comments?: string; version?: number },
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;
    const pr = await this.prService.approve(id, userId, role as Role, {
      ...body,
      ipAddress,
    });
    return { data: mapPRDetail(pr) };
  }

  @Post(':id/reject')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'pr',
    action: 'REJECT',
    modelName: 'purchaseRequest',
  })
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() body: { comments?: string; version?: number },
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;
    const pr = await this.prService.reject(id, userId, role as Role, {
      ...body,
      ipAddress,
    });
    return { data: mapPRDetail(pr) };
  }

  @Post(':id/cancel')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'pr',
    action: 'CANCEL',
    modelName: 'purchaseRequest',
  })
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() body: { comments?: string; version?: number },
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;
    const pr = await this.prService.cancel(id, userId, role as Role, {
      ...body,
      ipAddress,
    });
    return { data: mapPRDetail(pr) };
  }

  @Post(':id/convert-to-po')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'pr',
    action: 'CONVERT_TO_PO',
    modelName: 'purchaseRequest',
  })
  @HttpCode(HttpStatus.CREATED)
  async convertToPo(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body()
    body: {
      supplierId: string;
      currencyId: string;
      comments?: string;
      version?: number;
      lines?: Array<{ itemId: string; unitPrice: number }>;
    },
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;
    const po = await this.prService.convertToPo(id, userId, role as Role, {
      ...body,
      ipAddress,
    });
    // ConvertToPo creates a Purchase Order, so return mapped PO detail
    return { data: po };
  }
}
