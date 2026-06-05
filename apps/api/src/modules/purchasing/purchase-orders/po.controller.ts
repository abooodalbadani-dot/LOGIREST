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
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PurchaseOrderService } from './po.service';
import { WorkflowStateGuard } from '../../../guards/workflow-state.guard';
import { WorkflowAction } from '../../../decorators/workflow-action.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ActiveScope } from '../../../auth/decorators/active-scope.decorator';
import { Idempotent } from '../../../decorators/idempotent.decorator';
import {
  ApiSecureController,
  ApiIdempotentHeader,
} from '../../../decorators/swagger-docs.decorator';
import { Role } from '@prisma/client';
import { ScopeValidationService } from '../../../auth/scope-validation.service';
import { PrismaService } from '../../../database/prisma.service';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CreatePoDto } from './dto/create-po.dto';
import { UpdatePoDto } from './dto/update-po.dto';
import type { Request } from 'express';

// Map database fields to match the frontend expected schemas
function mapPODetail(po: Record<string, unknown>) {
  const poLines = (po.lines as Record<string, unknown>[]) || [];
  const supplier = po.supplier as Record<string, unknown> | null;
  const purchaseRequest = po.purchaseRequest as Record<string, unknown> | null;
  const warehouse = purchaseRequest?.warehouse as Record<
    string,
    unknown
  > | null;
  const currency = po.currency as Record<string, unknown> | null;

  const lines = poLines.map((line: Record<string, unknown>) => {
    const item = line.item as Record<string, unknown> | null;
    const unitOfMeasure = item?.unitOfMeasure as Record<string, unknown> | null;

    return {
      id: line.id as string,
      item: item
        ? {
            id: item.id as string,
            code: item.sku as string,
            name_ar: item.name as string,
            name_en: item.name as string,
            primary_uom: unitOfMeasure
              ? {
                  id: unitOfMeasure.id as string,
                  code: unitOfMeasure.code as string,
                }
              : undefined,
          }
        : undefined,
      item_id: line.itemId as string,
      item_sku: item?.sku as string,
      item_name: item?.name as string,
      quantity: Number(line.quantity),
      qty: Number(line.quantity),
      unit_cost_foreign: Number(line.unitPrice),
      unit_price: Number(line.unitPrice),
      uom_id: (item?.uomId as string) || '',
      notes: '',
    };
  });

  const supplierTotalAmount = lines.reduce(
    (sum: number, line) => sum + line.quantity * line.unit_price,
    0,
  );

  const createdAtIso = po.createdAt
    ? (po.createdAt instanceof Date
        ? po.createdAt
        : new Date(po.createdAt as string)
      ).toISOString()
    : new Date().toISOString();

  return {
    id: po.id as string,
    document_number: po.poNumber as string,
    status: po.status as string,
    pr_id: po.prId as string,
    version: po.version as number,
    supplier_id: po.supplierId as string,
    supplier_name: (supplier?.name as string) || '',
    warehouse_name: (warehouse?.name as string) || '',
    currency_code: (currency?.code as string) || '',
    currency_id: po.currencyId as string,
    exchange_rate: 1.0,
    expected_date: createdAtIso,
    expected_delivery_date: createdAtIso,
    target_warehouse_id: (purchaseRequest?.warehouseId as string) || undefined,
    lines,
    supplier_total_amount: supplierTotalAmount,
    base_total_amount: supplierTotalAmount,
    total: supplierTotalAmount,
    notes: '',
    audit_log: [],
    created_at: createdAtIso,
    created_by: 'System',
    updated_at: createdAtIso,
  };
}

function mapPOSummary(po: Record<string, unknown>) {
  const lines = (po.lines as Record<string, unknown>[]) || [];
  const supplier = po.supplier as Record<string, unknown> | null;
  const currency = po.currency as Record<string, unknown> | null;

  const supplierTotalAmount = lines.reduce(
    (sum: number, line: Record<string, unknown>) =>
      sum + Number(line.quantity) * Number(line.unitPrice),
    0,
  );

  const createdAtIso = po.createdAt
    ? (po.createdAt instanceof Date
        ? po.createdAt
        : new Date(po.createdAt as string)
      ).toISOString()
    : new Date().toISOString();

  return {
    id: po.id as string,
    document_number: po.poNumber as string,
    status: po.status as string,
    supplier_id: po.supplierId as string,
    supplier_name: (supplier?.name as string) || '',
    currency_code: (currency?.code as string) || '',
    expected_date: createdAtIso,
    supplier_total_amount: supplierTotalAmount,
    created_at: createdAtIso,
  };
}

@Controller('procurement/purchase-orders')
@ApiSecureController()
export class PurchaseOrderController {
  constructor(
    private readonly poService: PurchaseOrderService,
    private readonly prisma: PrismaService,
    private readonly scopeValidationService: ScopeValidationService,
  ) {}

  @Post()
  @Idempotent()
  @ApiIdempotentHeader()
  async create(
    @Body() body: CreatePoDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    if (role !== Role.ADMIN) {
      if (!body.prId) {
        throw new BadRequestException(
          'prId is required for non-administrative users to create a Purchase Order.',
        );
      }
      const pr = await this.prisma.purchaseRequest.findUnique({
        where: { id: body.prId },
        select: { warehouseId: true },
      });
      if (!pr) {
        throw new NotFoundException(
          `Purchase Request with ID ${body.prId} not found.`,
        );
      }
      await this.scopeValidationService.validateWarehouse(
        userId,
        role,
        pr.warehouseId,
      );
    }
    const po = await this.poService.create(body, userId);
    return { data: mapPODetail(po) };
  }

  @Get()
  async findAll(
    @Query()
    query: {
      status?: string;
      supplier_id?: string;
      search?: string;
      page?: string;
    },
    @ActiveScope('warehouseId') warehouseId?: string,
  ) {
    const result = await this.poService.findAll(
      {
        status: query.status,
        supplierId: query.supplier_id,
        search: query.search,
        page: query.page ? Number(query.page) : 1,
      },
      warehouseId,
    );

    return {
      data: result.data.map(mapPOSummary),
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    const po = await this.poService.findOne(id);
    if (po.purchaseRequest?.warehouseId) {
      await this.scopeValidationService.validateWarehouse(
        userId,
        role,
        po.purchaseRequest.warehouseId,
      );
    } else if (role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Access denied: Purchase Order lacks warehouse scope.',
      );
    }
    return { data: mapPODetail(po) };
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.INV_MGR, Role.PROC_OFFICER)
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body() body: UpdatePoDto,
  ) {
    const po = await this.poService.findOne(id);
    if (po.purchaseRequest?.warehouseId) {
      await this.scopeValidationService.validateWarehouse(
        userId,
        role,
        po.purchaseRequest.warehouseId,
      );
    } else if (role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Access denied: Cannot update a Purchase Order lacking warehouse scope.',
      );
    }
    const updated = await this.poService.update(id, body);
    return { data: mapPODetail(updated) };
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.INV_MGR, Role.PROC_OFFICER)
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query('version') version?: string,
  ) {
    const po = await this.poService.findOne(id);
    if (po.purchaseRequest?.warehouseId) {
      await this.scopeValidationService.validateWarehouse(
        userId,
        role,
        po.purchaseRequest.warehouseId,
      );
    } else if (role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Access denied: Cannot delete a Purchase Order lacking warehouse scope.',
      );
    }
    await this.poService.remove(id, version ? Number(version) : undefined);
    return { success: true };
  }

  @Post(':id/submit')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'po',
    action: 'SUBMIT',
    modelName: 'purchaseOrder',
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

    const po = await this.poService.submit(id, userId, role, {
      ...body,
      ipAddress,
    });
    return { data: mapPODetail(po) };
  }

  @Post(':id/approve')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'po',
    action: 'APPROVE',
    modelName: 'purchaseOrder',
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

    const po = await this.poService.approve(id, userId, role, {
      ...body,
      ipAddress,
    });
    return { data: mapPODetail(po) };
  }

  @Post(':id/reject')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'po',
    action: 'REJECT',
    modelName: 'purchaseOrder',
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

    const po = await this.poService.reject(id, userId, role, {
      ...body,
      ipAddress,
    });
    return { data: mapPODetail(po) };
  }

  @Post(':id/cancel')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'po',
    action: 'CANCEL',
    modelName: 'purchaseOrder',
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

    const po = await this.poService.cancel(id, userId, role, {
      ...body,
      ipAddress,
    });
    return { data: mapPODetail(po) };
  }

  @Post(':id/email')
  @HttpCode(HttpStatus.OK)
  async email(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('recipient_email') recipientEmail?: string,
  ) {
    return this.poService.email(id, userId, recipientEmail);
  }
}
