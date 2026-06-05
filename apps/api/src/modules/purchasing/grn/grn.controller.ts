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
import { PrismaService } from '../../../database/prisma.service';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CreateGrnDto } from './dto/create-grn.dto';
import { UpdateGrnDto } from './dto/update-grn.dto';
import type { Request } from 'express';

function mapGRNDetail(grn: Record<string, unknown>) {
  const grnLines = (grn.lines as Record<string, unknown>[]) || [];
  const purchaseOrder = grn.purchaseOrder as Record<string, unknown> | null;
  const supplier = purchaseOrder?.supplier as Record<string, unknown> | null;

  const lines = grnLines.map((line: Record<string, unknown>) => {
    const item = line.item as Record<string, unknown> | null;
    const lot = line.lot as Record<string, unknown> | null;
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
              : { id: '', code: '' },
          }
        : {
            id: '',
            code: '',
            name_ar: '',
            name_en: '',
            primary_uom: { id: '', code: '' },
          },
      lot: lot
        ? {
            id: lot.id as string,
            lot_number: lot.lotNumber as string,
            expiry_date: lot.expiryDate
              ? (lot.expiryDate instanceof Date
                  ? lot.expiryDate
                  : new Date(lot.expiryDate as string)
                ).toISOString()
              : null,
          }
        : null,
      qty: Number(line.quantityReceived),
      received_qty: Number(line.quantityReceived),
      uom_id: (item?.uomId as string) || '',
      unit_cost_foreign: Number(line.unitPrice),
      unit_cost_base: Number(line.unitPrice),
    };
  });

  const createdAtIso = grn.createdAt
    ? (grn.createdAt instanceof Date
        ? grn.createdAt
        : new Date(grn.createdAt as string)
      ).toISOString()
    : new Date().toISOString();

  return {
    id: grn.id as string,
    document_number: grn.grnNumber as string,
    status: grn.status as string,
    supplier_id: (purchaseOrder?.supplierId as string) || '',
    supplier: supplier
      ? {
          id: supplier.id as string,
          name: supplier.name as string,
        }
      : undefined,
    po_id: grn.poId as string,
    po_number: (purchaseOrder?.poNumber as string) || '',
    po_fx_rate: 1.0,
    currency_id: (purchaseOrder?.currencyId as string) || '',
    warehouse_id: grn.warehouseId as string,
    fx_rate: 1.0,
    fx_rate_captured_at: createdAtIso,
    version: grn.version as number,
    notes: '',
    created_at: createdAtIso,
    created_by: 'System',
    updated_at: createdAtIso,
    lines,
  };
}

function mapGRNSummary(grn: Record<string, unknown>) {
  const lines = (grn.lines as Record<string, unknown>[]) || [];
  const purchaseOrder = grn.purchaseOrder as Record<string, unknown> | null;
  const supplier = purchaseOrder?.supplier as Record<string, unknown> | null;

  const supplierTotalAmount = lines.reduce(
    (sum: number, line: Record<string, unknown>) =>
      sum + Number(line.quantityReceived) * Number(line.unitPrice),
    0,
  );

  const createdAtIso = grn.createdAt
    ? (grn.createdAt instanceof Date
        ? grn.createdAt
        : new Date(grn.createdAt as string)
      ).toISOString()
    : new Date().toISOString();

  return {
    id: grn.id as string,
    document_number: grn.grnNumber as string,
    status: grn.status as string,
    supplier_id: (purchaseOrder?.supplierId as string) || '',
    supplier_name: (supplier?.name as string) || '',
    po_id: grn.poId as string,
    po_number: (purchaseOrder?.poNumber as string) || '',
    warehouse_id: grn.warehouseId as string,
    created_at: createdAtIso,
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
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async create(
    @Body() body: CreateGrnDto,
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
  @Roles(Role.ADMIN, Role.INV_MGR, Role.PROC_OFFICER)
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body() body: UpdateGrnDto,
  ) {
    const grnRecord = await this.prisma.goodsReceivedNote.findUnique({
      where: { id },
      select: { warehouseId: true },
    });
    if (grnRecord) {
      await this.scopeValidationService.validateWarehouse(
        userId,
        role,
        grnRecord.warehouseId,
      );
    }

    const poId = body.poId || body.po_id;
    const warehouseId = body.warehouseId || body.warehouse_id;
    const lines = (body.lines as Record<string, unknown>[])?.map((line) => ({
      id: line.id as string | undefined,
      itemId: String(line.itemId || line.item_id || ''),
      lotId: (line.lotId !== undefined ? line.lotId : line.lot_id) as
        | string
        | null
        | undefined,
      quantity: Number(line.quantity || line.qty || line.received_qty || 0),
      unitPrice: Number(line.unitPrice || line.unit_cost_foreign || 0),
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
  @Roles(Role.ADMIN, Role.INV_MGR, Role.PROC_OFFICER)
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query('version') version?: string,
  ) {
    const grnRecord = await this.prisma.goodsReceivedNote.findUnique({
      where: { id },
      select: { warehouseId: true },
    });
    if (grnRecord) {
      await this.scopeValidationService.validateWarehouse(
        userId,
        role,
        grnRecord.warehouseId,
      );
    }

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
