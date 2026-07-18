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
  NotFoundException,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GrnService } from './grn.service';
import { GrnPostService } from '../grn-post.service';
import { GrnVoidService } from '../../operations/grn-void.service';
import { WorkflowStateGuard } from '../../../guards/workflow-state.guard';
import { WorkflowAction } from '../../../decorators/workflow-action.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ActiveScope } from '../../../auth/decorators/active-scope.decorator';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import { Role } from '@prisma/client';
import { ScopeValidationService } from '../../../auth/scope-validation.service';
import { PrismaService } from '../../../database/prisma.service';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { CreateGrnDto } from './dto/create-grn.dto';
import { UpdateGrnDto } from './dto/update-grn.dto';
import { PdfGeneratorService } from '../../pdf/pdf-generator.service';
import type { Request, Response } from 'express';

interface UpdateGrnLineBody {
  itemId: string;
  lotId?: string | null;
  lotNumber?: string | null;
  expiryDate?: string | null;
  receivedQuantity: number;
  unitPrice?: number;
  unitCostForeign?: number;
}

function mapGRNDetail(grn: Record<string, unknown>) {
  const grnLines = (grn.lines as Record<string, unknown>[]) || [];
  const purchaseOrder = grn.purchaseOrder as Record<string, unknown> | null;
  const supplier = purchaseOrder?.supplier as Record<string, unknown> | null;
  const warehouse = grn.warehouse as Record<string, unknown> | null;

  const lines = grnLines.map((line: Record<string, unknown>) => {
    const item = line.item as Record<string, unknown> | null;
    const lot = line.lot as Record<string, unknown> | null;
    const unitOfMeasure = item?.unitOfMeasure as Record<string, unknown> | null;

    return {
      id: line.id as string,
      item: item
        ? {
            id: item.id as string,
            code: (item.sku as string) || (item.code as string) || '',
            name: item.name as string,
            nameAr: item.name as string,
            nameEn: item.name as string,
            primaryUom: unitOfMeasure
              ? {
                  id: unitOfMeasure.id as string,
                  code: unitOfMeasure.code as string,
                }
              : { id: '', code: '' },
          }
        : {
            id: '',
            code: '',
            name: '',
            nameAr: '',
            nameEn: '',
            primaryUom: { id: '', code: '' },
          },
      lot: lot
        ? {
            id: lot.id as string,
            lotNumber: lot.lotNumber as string,
            expiryDate: lot.expiryDate
              ? (lot.expiryDate instanceof Date
                  ? lot.expiryDate
                  : new Date(lot.expiryDate as string)
                ).toISOString()
              : null,
          }
        : null,
      qty: Number(line.quantityReceived),
      receivedQty: Number(line.quantityReceived),
      uomId: (item?.uomId as string) || '',
      unitCostForeign:
        line.unitPriceForeign !== undefined && line.unitPriceForeign !== null
          ? Number(line.unitPriceForeign)
          : Number(line.unitPrice),
      unitCostBase:
        line.unitPriceBase !== undefined && line.unitPriceBase !== null
          ? Number(line.unitPriceBase)
          : Number(line.unitPrice),
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
    documentNumber: grn.grnNumber as string,
    status: grn.status as string,
    supplierId: (purchaseOrder?.supplierId as string) || '',
    supplier: supplier
      ? {
          id: supplier.id as string,
          name: supplier.name as string,
        }
      : undefined,
    supplierName: (supplier?.name as string) || '',
    poId: grn.poId as string,
    poNumber: (purchaseOrder?.poNumber as string) || '',
    poFxRate: 1.0,
    currencyId: (purchaseOrder?.currencyId as string) || '',
    currencyCode:
      ((purchaseOrder?.currency as Record<string, unknown> | null)
        ?.code as string) || '',
    warehouseId: grn.warehouseId as string,
    warehouseName: (warehouse?.name as string) || '',
    fxRate:
      grn.fxRate !== undefined && grn.fxRate !== null
        ? Number(grn.fxRate)
        : 1.0,
    fxRateCapturedAt: grn.fxRateCapturedAt
      ? (grn.fxRateCapturedAt instanceof Date
          ? grn.fxRateCapturedAt
          : new Date(grn.fxRateCapturedAt as string)
        ).toISOString()
      : createdAtIso,
    version: grn.version as number,
    notes: (grn.notes as string) || '',
    createdAt: createdAtIso,
    createdBy:
      ((grn.createdBy as Record<string, unknown> | null)?.name as string) ||
      'System',
    updatedAt: (() => {
      const events = (grn.approvalEvents as Array<Record<string, unknown>>) || [];
      const lastEvent = events.length > 0 ? events[events.length - 1] : null;
      return lastEvent?.createdAt
        ? (lastEvent.createdAt instanceof Date
            ? lastEvent.createdAt
            : new Date(lastEvent.createdAt as string)
          ).toISOString()
        : createdAtIso;
    })(),
    postedAt: grn.postedAt
      ? (grn.postedAt instanceof Date
          ? grn.postedAt
          : new Date(grn.postedAt as string)
        ).toISOString()
      : null,
    lines,
  };
}

function mapGRNSummary(grn: Record<string, unknown>) {
  const lines = (grn.lines as Record<string, unknown>[]) || [];
  const purchaseOrder = grn.purchaseOrder as Record<string, unknown> | null;
  const supplier = purchaseOrder?.supplier as Record<string, unknown> | null;
  const warehouse = grn.warehouse as Record<string, unknown> | null;

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
    documentNumber: grn.grnNumber as string,
    status: grn.status as string,
    supplierId: (purchaseOrder?.supplierId as string) || '',
    supplierName: (supplier?.name as string) || '',
    poId: grn.poId as string,
    poNumber: (purchaseOrder?.poNumber as string) || '',
    currencyCode:
      ((purchaseOrder?.currency as Record<string, unknown> | null)
        ?.code as string) || '',
    warehouseId: grn.warehouseId as string,
    warehouseName: (warehouse?.name as string) || '',
    createdAt: createdAtIso,
    supplierTotalAmount: supplierTotalAmount,
    postedAt: grn.postedAt
      ? (grn.postedAt instanceof Date
          ? grn.postedAt
          : new Date(grn.postedAt as string)
        ).toISOString()
      : null,
  };
}

@Controller('procurement/grns')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecureController()
export class GrnController {
  constructor(
    private readonly grnService: GrnService,
    private readonly grnPostService: GrnPostService,
    private readonly grnVoidService: GrnVoidService,
    private readonly scopeValidationService: ScopeValidationService,
    private readonly prisma: PrismaService,
    private readonly pdfGeneratorService: PdfGeneratorService,
  ) {}

  @Post()
  @Roles(
    Role.ADMIN,
    Role.WH_KEEPER,
    Role.INV_MGR,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
  )
  async create(
    @Body() body: CreateGrnDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    const poId = body.poId;
    const warehouseId = body.warehouseId;
    if (!poId || !warehouseId) {
      throw new BadRequestException('poId and warehouseId are required');
    }

    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      warehouseId,
    );

    const incomingLines = body.lineItems || body.lines || [];
    const lines = incomingLines.map((line) => {
      const itemId = line.itemId;
      const lotId =
        line.lotId || (line.lotAllocations && line.lotAllocations[0]?.lotId);
      const lotNumber =
        line.lotNumber ||
        (line.lotAllocations && line.lotAllocations[0]?.lotNumber);
      const expiryDate =
        line.expiryDate ||
        (line.lotAllocations && line.lotAllocations[0]?.expiryDate);
      const quantity = Number(line.receivedQty);
      const unitPrice = Number(line.unitCostForeign);
      return {
        itemId: itemId || '',
        lotId: lotId || null,
        lotNumber: lotNumber || null,
        expiryDate: expiryDate || null,
        quantity,
        unitPrice,
      };
    });

    const grn = await this.grnService.create(
      { poId, warehouseId, notes: body.notes, lines },
      userId,
    );
    return { data: mapGRNDetail(grn) };
  }

  @Get()
  async findAll(
    @Query() query: { status?: string; search?: string; page?: string },
    @ActiveScope()
    activeScope?: {
      branchId?: string;
      warehouseId?: string;
      departmentId?: string;
    },
  ) {
    const result = await this.grnService.findAll(
      {
        status: query.status,
        search: query.search,
        page: query.page ? Number(query.page) : 1,
      },
      activeScope,
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

  @Get(':id/pdf')
  async getPdf(
    @Param('id') id: string,
    @Query('locale') locale: 'ar' | 'en' = 'en',
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Res() res: Response,
  ) {
    const grn = await this.grnService.findOne(id);
    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      grn.warehouseId,
    );

    const buffer = await this.pdfGeneratorService.generateGrnPdf(id, locale);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=GRN_${grn.grnNumber}.pdf`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Put(':id/lines')
  @Roles(
    Role.ADMIN,
    Role.WH_KEEPER,
    Role.INV_MGR,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
  )
  async updateLine(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body() body: UpdateGrnLineBody,
  ) {
    const grnRecord = await this.prisma.goodsReceivedNote.findUnique({
      where: { id },
      select: { warehouseId: true, status: true },
    });
    if (!grnRecord) {
      throw new NotFoundException(
        `Goods Received Note with ID ${id} not found`,
      );
    }
    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      grnRecord.warehouseId,
    );

    if (grnRecord.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only DRAFT Goods Received Notes can be updated.',
      );
    }

    const unitPrice =
      body.unitCostForeign !== undefined
        ? body.unitCostForeign
        : body.unitPrice !== undefined
          ? body.unitPrice
          : 0;

    await this.grnService.updateLine(id, {
      itemId: body.itemId,
      lotId: body.lotId,
      lotNumber: body.lotNumber,
      expiryDate: body.expiryDate,
      receivedQuantity: body.receivedQuantity,
      unitPrice,
    });

    return { success: true };
  }

  @Put(':id')
  @Roles(
    Role.ADMIN,
    Role.WH_KEEPER,
    Role.INV_MGR,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
  )
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

    const poId = body.poId;
    const warehouseId = body.warehouseId;

    const incomingLines = body.lineItems || body.lines;
    let lines:
      | Array<{
          id?: string;
          itemId: string;
          lotId?: string | null;
          lotNumber?: string | null;
          expiryDate?: string | null;
          quantity: number;
          unitPrice: number;
        }>
      | undefined = undefined;
    if (incomingLines) {
      lines = incomingLines.map((line) => {
        const itemId = line.itemId;
        const lotId =
          line.lotId || (line.lotAllocations && line.lotAllocations[0]?.lotId);
        const lotNumber =
          line.lotNumber ||
          (line.lotAllocations && line.lotAllocations[0]?.lotNumber);
        const expiryDate =
          line.expiryDate ||
          (line.lotAllocations && line.lotAllocations[0]?.expiryDate);
        const quantity = Number(line.receivedQty);
        const unitPrice = Number(line.unitCostForeign);
        return {
          id: line.id,
          itemId: itemId || '',
          lotId: lotId || null,
          lotNumber: lotNumber || null,
          expiryDate: expiryDate || null,
          quantity,
          unitPrice,
        };
      });
    }

    const grn = await this.grnService.update(id, {
      poId,
      warehouseId,
      version: body.version,
      lines,
    });
    return { data: mapGRNDetail(grn) };
  }

  @Delete(':id')
  @Roles(
    Role.ADMIN,
    Role.WH_KEEPER,
    Role.INV_MGR,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
  )
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
  @Roles(Role.ADMIN, Role.INV_MGR, Role.BRANCH_MGR)
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

    const postedGrn = await this.grnPostService.post(
      id,
      userId,
      role,
      body.version,
      ipAddress,
    );
    return {
      data: mapGRNDetail(postedGrn),
    };
  }

  @Post(':id/void')
  @Roles(Role.ADMIN, Role.INV_MGR)
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'grn',
    action: 'VOID',
    modelName: 'goodsReceivedNote',
  })
  @HttpCode(HttpStatus.OK)
  async void(
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

    const grn = await this.grnVoidService.void(
      id,
      userId,
      role,
      body.version,
      ipAddress,
    );
    return { data: mapGRNDetail(grn as Record<string, unknown>) };
  }

  @Post(':id/submit')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'grn',
    action: 'SUBMIT',
    modelName: 'goodsReceivedNote',
  })
  @Roles(
    Role.ADMIN,
    Role.WH_KEEPER,
    Role.INV_MGR,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
  )
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

    const grn = await this.grnService.submit(id, userId, role, {
      ...body,
      ipAddress,
    });
    return { data: mapGRNDetail(grn) };
  }

  @Post(':id/cancel')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'grn',
    action: 'CANCEL',
    modelName: 'goodsReceivedNote',
  })
  @Roles(
    Role.ADMIN,
    Role.WH_KEEPER,
    Role.INV_MGR,
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

    const grn = await this.grnService.cancel(id, userId, role, {
      ...body,
      ipAddress,
    });
    return { data: mapGRNDetail(grn) };
  }
}
