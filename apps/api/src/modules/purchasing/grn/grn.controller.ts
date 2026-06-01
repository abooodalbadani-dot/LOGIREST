import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GrnService } from './grn.service';
import { GrnPostService } from '../grn-post.service';
import { WorkflowStateGuard } from '../../../guards/workflow-state.guard';
import { WorkflowAction } from '../../../decorators/workflow-action.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ActiveScope } from '../../../auth/decorators/active-scope.decorator';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import { Role } from '@prisma/client';
import { ScopeValidationService } from '../../../auth/scope-validation.service';
import type { Request } from 'express';

function mapGRNDetail(grn: any) {
  const lines = (grn.lines || []).map((line: any) => ({
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
    lot: line.lot
      ? {
          id: line.lot.id,
          lot_number: line.lot.lotNumber,
          expiry_date: line.lot.expiryDate
            ? line.lot.expiryDate.toISOString()
            : null,
        }
      : null,
    qty: Number(line.quantityReceived),
    received_qty: Number(line.quantityReceived),
    uom_id: line.item?.uomId || '',
    unit_cost_foreign: Number(line.unitPrice),
    unit_cost_base: Number(line.unitPrice),
  }));

  return {
    id: grn.id,
    document_number: grn.grnNumber,
    status: grn.status,
    supplier_id: grn.purchaseOrder?.supplierId || '',
    supplier: grn.purchaseOrder?.supplier
      ? {
          id: grn.purchaseOrder.supplier.id,
          name: grn.purchaseOrder.supplier.name,
        }
      : undefined,
    po_id: grn.poId,
    po_number: grn.purchaseOrder?.poNumber || '',
    po_fx_rate: 1.0,
    currency_id: grn.purchaseOrder?.currencyId || '',
    warehouse_id: grn.warehouseId,
    fx_rate: 1.0,
    fx_rate_captured_at: grn.createdAt.toISOString(),
    version: grn.version,
    notes: '',
    created_at: grn.createdAt.toISOString(),
    created_by: 'System',
    updated_at: grn.createdAt.toISOString(),
    lines,
  };
}

function mapGRNSummary(grn: any) {
  const lines = grn.lines || [];
  const supplierTotalAmount = lines.reduce(
    (sum: number, line: any) =>
      sum + Number(line.quantityReceived) * Number(line.unitPrice),
    0,
  );

  return {
    id: grn.id,
    document_number: grn.grnNumber,
    status: grn.status,
    supplier_id: grn.purchaseOrder?.supplierId || '',
    supplier_name: grn.purchaseOrder?.supplier?.name || '',
    po_id: grn.poId,
    po_number: grn.purchaseOrder?.poNumber || '',
    warehouse_id: grn.warehouseId,
    created_at: grn.createdAt.toISOString(),
    supplier_total_amount: supplierTotalAmount,
  };
}

@Controller('procurement/grns')
@ApiSecureController()
export class GrnController {
  constructor(
    private readonly grnService: GrnService,
    private readonly grnPostService: GrnPostService,
    private readonly scopeValidationService: ScopeValidationService,
  ) {}

  @Post()
  async create(
    @Body()
    body: {
      po_id?: string;
      poId?: string;
      warehouse_id?: string;
      warehouseId?: string;
      notes?: string;
      lines: Array<{
        item_id?: string;
        itemId?: string;
        lot_id?: string | null;
        lotId?: string | null;
        qty?: number;
        quantity?: number;
        received_qty?: number;
        unit_cost_foreign?: number;
        unitPrice?: number;
      }>;
    },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    const poId = body.poId || body.po_id;
    const warehouseId = body.warehouseId || body.warehouse_id;
    if (!poId || !warehouseId) {
      throw new BadRequestException('poId and warehouseId are required');
    }

    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      warehouseId,
    );

    const lines = body.lines.map((line) => ({
      itemId: line.itemId || line.item_id || '',
      lotId: line.lotId !== undefined ? line.lotId : line.lot_id,
      quantity: line.quantity || line.qty || line.received_qty || 0,
      unitPrice: line.unitPrice || line.unit_cost_foreign || 0,
    }));

    const grn = await this.grnService.create(
      { poId, warehouseId, notes: body.notes, lines },
      userId,
    );
    return { data: mapGRNDetail(grn) };
  }

  @Get()
  async findAll(
    @Query() query: { status?: string; search?: string; page?: string },
    @ActiveScope('warehouseId') warehouseId?: string,
  ) {
    const result = await this.grnService.findAll(
      {
        status: query.status,
        search: query.search,
        page: query.page ? Number(query.page) : 1,
      },
      warehouseId,
    );

    return {
      data: result.data.map(mapGRNSummary),
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    const grn = await this.grnService.findOne(id);
    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      grn.warehouseId,
    );
    return { data: mapGRNDetail(grn) };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      po_id?: string;
      poId?: string;
      warehouse_id?: string;
      warehouseId?: string;
      version: number;
      notes?: string;
      lines?: Array<{
        id?: string;
        item_id?: string;
        itemId?: string;
        lot_id?: string | null;
        lotId?: string | null;
        qty?: number;
        quantity?: number;
        received_qty?: number;
        unit_cost_foreign?: number;
        unitPrice?: number;
      }>;
    },
  ) {
    const poId = body.poId || body.po_id;
    const warehouseId = body.warehouseId || body.warehouse_id;
    const lines = body.lines?.map((line) => ({
      id: line.id,
      itemId: line.itemId || line.item_id || '',
      lotId: line.lotId !== undefined ? line.lotId : line.lot_id,
      quantity: line.quantity || line.qty || line.received_qty || 0,
      unitPrice: line.unitPrice || line.unit_cost_foreign || 0,
    }));

    const grn = await this.grnService.update(id, {
      poId,
      warehouseId,
      version: body.version,
      lines,
    });
    return { data: mapGRNDetail(grn) };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Query('version') version?: string) {
    await this.grnService.remove(id, version ? Number(version) : undefined);
    return { success: true };
  }

  @Throttle({ short: { limit: 100, ttl: 60000 } })
  @Post(':id/post')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'grn',
    action: 'POST',
    modelName: 'goodsReceivedNote',
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

    const grn = await this.grnPostService.post(
      id,
      userId,
      role,
      body.version,
      ipAddress,
    );
    return { data: mapGRNDetail(grn) };
  }

  @Post(':id/cancel')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'grn',
    action: 'CANCEL',
    modelName: 'goodsReceivedNote',
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

    const grn = await this.grnService.cancel(id, userId, role, {
      ...body,
      ipAddress,
    });
    return { data: mapGRNDetail(grn) };
  }
}
