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
            nameAr: item.name as string,
            nameEn: item.name as string,
            primaryUom: unitOfMeasure
              ? {
                  id: unitOfMeasure.id as string,
                  code: unitOfMeasure.code as string,
                }
              : undefined,
          }
        : undefined,
      itemId: line.itemId as string,
      itemSku: item?.sku as string,
      itemName: item?.name as string,
      quantity: Number(line.quantity),
      qty: Number(line.quantity),
      unitCostForeign: Number(line.unitPrice),
      unitPrice: Number(line.unitPrice),
      uomId: (item?.uomId as string) || '',
      notes: '',
    };
  });

  const supplierTotalAmount = lines.reduce(
    (sum: number, line) => sum + line.quantity * line.unitPrice,
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
    documentNumber: po.poNumber as string,
    status: po.status as string,
    prId: po.prId as string,
    version: po.version as number,
    supplierId: po.supplierId as string,
    supplierName: (supplier?.name as string) || '',
    warehouseName: (warehouse?.name as string) || '',
    currencyCode: (currency?.code as string) || '',
    currencyId: po.currencyId as string,
    exchangeRate: 1.0,
    expectedDate: createdAtIso,
    expectedDeliveryDate: createdAtIso,
    targetWarehouseId: (purchaseRequest?.warehouseId as string) || undefined,
    lines,
    supplierTotalAmount: supplierTotalAmount,
    baseTotalAmount: supplierTotalAmount,
    total: supplierTotalAmount,
    notes: '',
    auditLog: [],
    createdAt: createdAtIso,
    createdBy: 'System',
    updatedAt: createdAtIso,
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
    documentNumber: po.poNumber as string,
    status: po.status as string,
    supplierId: po.supplierId as string,
    supplierName: (supplier?.name as string) || '',
    currencyCode: (currency?.code as string) || '',
    expectedDate: createdAtIso,
    supplierTotalAmount: supplierTotalAmount,
    createdAt: createdAtIso,
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
    const rawBody = body as unknown as Record<string, unknown>;
    const supplierId =
      body.supplierId ??
      (typeof rawBody.supplier_id === 'string'
        ? rawBody.supplier_id
        : undefined);
    const currencyId =
      body.currencyId ??
      (typeof rawBody.currency_id === 'string'
        ? rawBody.currency_id
        : undefined);
    const prId =
      body.prId ??
      (typeof rawBody.pr_id === 'string' ? rawBody.pr_id : undefined);

    if (!supplierId || !currencyId) {
      throw new BadRequestException('supplierId and currencyId are required');
    }

    const rawLines = (rawBody.lines ?? []) as Record<string, unknown>[];
    const lines = rawLines.map((line) => {
      const itemId = (line.itemId ?? line.item_id) as string | undefined;
      const quantity = (line.quantity ?? line.qty) as number | undefined;
      const unitPrice = (line.unitPrice ??
        line.unit_price ??
        line.unit_cost_foreign) as number | undefined;
      if (!itemId || quantity === undefined || unitPrice === undefined) {
        throw new BadRequestException(
          'itemId, quantity, and unitPrice are required for each line',
        );
      }
      return {
        itemId,
        quantity,
        unitPrice,
      };
    });

    if (role !== Role.ADMIN) {
      if (!prId) {
        throw new BadRequestException(
          'prId is required for non-administrative users to create a Purchase Order.',
        );
      }
      const pr = await this.prisma.purchaseRequest.findUnique({
        where: { id: prId },
        select: { warehouseId: true },
      });
      if (!pr) {
        throw new NotFoundException(
          `Purchase Request with ID ${prId} not found.`,
        );
      }
      await this.scopeValidationService.validateWarehouse(
        userId,
        role,
        pr.warehouseId,
      );
    }
    const po = await this.poService.create(
      { supplierId, currencyId, prId, lines },
      userId,
    );
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

    const rawBody = body as unknown as Record<string, unknown>;
    const supplierId =
      body.supplierId ??
      (typeof rawBody.supplier_id === 'string'
        ? rawBody.supplier_id
        : undefined);
    const currencyId =
      body.currencyId ??
      (typeof rawBody.currency_id === 'string'
        ? rawBody.currency_id
        : undefined);

    let lines:
      | Array<{
          id?: string;
          itemId: string;
          quantity: number;
          unitPrice: number;
        }>
      | undefined = undefined;
    if (rawBody.lines) {
      const rawLines = rawBody.lines as Record<string, unknown>[];
      lines = rawLines.map((line) => {
        const itemId = (line.itemId ?? line.item_id) as string | undefined;
        const quantity = (line.quantity ?? line.qty) as number | undefined;
        const unitPrice = (line.unitPrice ??
          line.unit_price ??
          line.unit_cost_foreign) as number | undefined;
        if (!itemId || quantity === undefined || unitPrice === undefined) {
          throw new BadRequestException(
            'itemId, quantity, and unitPrice are required for each line',
          );
        }
        return {
          id: line.id as string | undefined,
          itemId,
          quantity,
          unitPrice,
        };
      });
    }

    const updated = await this.poService.update(id, {
      supplierId,
      currencyId,
      version: body.version,
      lines,
    });
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
