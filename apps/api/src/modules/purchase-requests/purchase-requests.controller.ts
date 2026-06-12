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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { Request } from 'express';

function mapPRDetail(pr: Record<string, unknown>) {
  const prLines = (pr.lines as Record<string, unknown>[]) || [];
  const createdBy = pr.createdBy as Record<string, unknown> | null;
  const warehouse = pr.warehouse as Record<string, unknown> | null;
  const branch = pr.branch as Record<string, unknown> | null;

  const lines = prLines.map((line: Record<string, unknown>) => {
    const item = line.item as Record<string, unknown> | null;
    const unitOfMeasure = item?.unitOfMeasure as Record<string, unknown> | null;

    return {
      id: line.id as string,
      item: {
        id: (item?.id as string) || '',
        code: (item?.sku as string) || '',
        nameAr: (item?.name as string) || '',
        nameEn: (item?.name as string) || '',
        primaryUom: unitOfMeasure
          ? {
              id: unitOfMeasure.id as string,
              code: unitOfMeasure.code as string,
            }
          : { id: '', code: '' },
      },
      reqQty: Number(line.quantity),
      uomId: (item?.uomId as string) || '',
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
    documentNumber: pr.requestNumber as string,
    status: pr.status as string,
    departmentId: pr.warehouseId as string, // Fallback since no department_id is stored directly
    warehouseId: pr.warehouseId as string,
    warehouseName: (warehouse?.name as string) || null,
    branchId: (pr.branchId as string) || null,
    branchName: (branch?.name as string) || null,
    expectedDate: createdAtIso,
    version: pr.version as number,
    notes: '',
    createdAt: createdAtIso,
    createdBy: (createdBy?.name as string) || 'System',
    updatedAt: createdAtIso,
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

  const warehouse = pr.warehouse as Record<string, unknown> | null;
  const branch = pr.branch as Record<string, unknown> | null;
  const createdBy = pr.createdBy as Record<string, unknown> | null;

  return {
    id: pr.id as string,
    documentNumber: pr.requestNumber as string,
    status: pr.status as string,
    departmentId: pr.warehouseId as string,
    warehouseId: pr.warehouseId as string,
    warehouseName: (warehouse?.name as string) || null,
    branchId: (pr.branchId as string) || null,
    branchName: (branch?.name as string) || null,
    expectedDate: createdAtIso,
    createdAt: createdAtIso,
    createdBy: (createdBy?.name as string) || 'System',
  };
}

@Controller('procurement/purchase-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecureController()
export class PurchaseRequestsController {
  constructor(
    private readonly prService: PurchaseRequestsService,
    private readonly scopeValidationService: ScopeValidationService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.PROC_OFFICER,
    Role.PROC_MGR,
    Role.BRANCH_MGR,
    Role.STORE_MGR,
  )
  @Idempotent()
  @ApiIdempotentHeader()
  async create(
    @Body()
    body: {
      branchId: string;
      warehouseId: string;
      lines: Array<{
        itemId: string;
        quantity: number;
      }>;
    },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    const branchId = body.branchId;
    const warehouseId = body.warehouseId;
    const lines = (body.lines || []).map((line) => ({
      itemId: line.itemId,
      quantity: Number(line.quantity),
    }));

    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      warehouseId,
    );
    const pr = await this.prService.create(
      { branchId, warehouseId, lines },
      userId,
    );
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
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.PROC_OFFICER,
    Role.PROC_MGR,
    Role.BRANCH_MGR,
  )
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
    const lines = (body.lines || []).map((line) => ({
      itemId: line.itemId,
      quantity: Number(line.quantity),
    }));

    const updated = await this.prService.update(id, {
      version: body.version,
      lines,
    });
    return { data: mapPRDetail(updated) };
  }

  @Delete(':id')
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.PROC_OFFICER,
    Role.PROC_MGR,
    Role.BRANCH_MGR,
  )
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
