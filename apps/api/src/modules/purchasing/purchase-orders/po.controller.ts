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
import type { Role } from '@logirest/shared-types';
import type { Request } from 'express';

// Map database fields to match the frontend expected schemas
function mapPODetail(po: any) {
  const lines = (po.lines || []).map((line: any) => ({
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
            : undefined,
        }
      : undefined,
    item_id: line.itemId,
    item_sku: line.item?.sku,
    item_name: line.item?.name,
    quantity: Number(line.quantity),
    qty: Number(line.quantity),
    unit_price: Number(line.unitPrice),
    unit_cost_foreign: Number(line.unitPrice),
    uom_id: line.item?.uomId || '',
    notes: '',
  }));

  const supplierTotalAmount = lines.reduce(
    (sum: number, line: any) => sum + line.quantity * line.unit_price,
    0,
  );

  const createdAtIso = po.createdAt
    ? (po.createdAt instanceof Date
        ? po.createdAt
        : new Date(po.createdAt)
      ).toISOString()
    : new Date().toISOString();

  return {
    id: po.id,
    document_number: po.poNumber,
    status: po.status,
    pr_id: po.prId,
    version: po.version,
    supplier_id: po.supplierId,
    supplier_name: po.supplier?.name || '',
    warehouse_name: po.purchaseRequest?.warehouse?.name || '',
    currency_code: po.currency?.code || '',
    currency_id: po.currencyId,
    exchange_rate: 1.0,
    expected_date: createdAtIso,
    expected_delivery_date: createdAtIso,
    target_warehouse_id: po.purchaseRequest?.warehouseId || undefined,
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

function mapPOSummary(po: any) {
  const lines = po.lines || [];
  const supplierTotalAmount = lines.reduce(
    (sum: number, line: any) =>
      sum + Number(line.quantity) * Number(line.unitPrice),
    0,
  );

  const createdAtIso = po.createdAt
    ? (po.createdAt instanceof Date
        ? po.createdAt
        : new Date(po.createdAt)
      ).toISOString()
    : new Date().toISOString();

  return {
    id: po.id,
    document_number: po.poNumber,
    status: po.status,
    supplier_id: po.supplierId,
    supplier_name: po.supplier?.name || '',
    currency_code: po.currency?.code || '',
    expected_date: createdAtIso,
    supplier_total_amount: supplierTotalAmount,
    created_at: createdAtIso,
  };
}

@Controller('procurement/purchase-orders')
@ApiSecureController()
export class PurchaseOrderController {
  constructor(private readonly poService: PurchaseOrderService) {}

  @Post()
  @Idempotent()
  @ApiIdempotentHeader()
  async create(
    @Body()
    body: {
      supplierId: string;
      currencyId: string;
      prId?: string;
      lines: Array<{ itemId: string; quantity: number; unitPrice: number }>;
    },
    @CurrentUser('id') userId: string,
  ) {
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
      data: result.items.map(mapPOSummary),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const po = await this.poService.findOne(id);
    return { data: mapPODetail(po) };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      supplierId?: string;
      currencyId?: string;
      version: number;
      lines?: Array<{
        id?: string;
        itemId: string;
        quantity: number;
        unitPrice: number;
      }>;
    },
  ) {
    const po = await this.poService.update(id, body);
    return { data: mapPODetail(po) };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Query('version') version?: string) {
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

  @Post(':id/post')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'po',
    action: 'POST',
    modelName: 'purchaseOrder',
  })
  @HttpCode(HttpStatus.OK)
  async postToLedger(
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

    const po = await this.poService.postToLedger(id, userId, role, {
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
