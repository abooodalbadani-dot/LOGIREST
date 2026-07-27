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
  Res,
} from '@nestjs/common';
import { PurchaseOrderService } from './po.service';
import { PdfGeneratorService } from '../../pdf/pdf-generator.service';
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
import { AllRoles } from '../../../auth/decorators/all-roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { CreatePoDto } from './dto/create-po.dto';
import { UpdatePoDto } from './dto/update-po.dto';
import type { Request, Response } from 'express';

// Map database fields to match the frontend expected schemas
function mapPODetail(po: Record<string, unknown>) {
  const poLines = (po.lines as Record<string, unknown>[]) || [];
  const supplier = po.supplier as Record<string, unknown> | null;
  const purchaseRequest = po.purchaseRequest as Record<string, unknown> | null;
  const warehouse = po.warehouse as Record<string, unknown> | null;
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
            image: (item.image as string) || null,
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
      uomId: (line.uomId as string) || (item?.uomId as string) || '',
      uom: line.uom
        ? {
            id: (line.uom as Record<string, unknown>).id as string,
            code: (line.uom as Record<string, unknown>).code as string,
            name: ((line.uom as Record<string, unknown>).name as string) || ((line.uom as Record<string, unknown>).code as string),
          }
        : unitOfMeasure
          ? {
              id: unitOfMeasure.id as string,
              code: unitOfMeasure.code as string,
              name: (unitOfMeasure.name as string) || (unitOfMeasure.code as string),
            }
          : undefined,
      notes: '',
    };
  });

  const supplierTotalAmount = lines.reduce(
    (sum: number, line) => sum + line.quantity * line.unitPrice,
    0,
  );

  const events =
    (po.approvalEvents as Array<Record<string, unknown>>) || [];
  const lastEvent = events.length > 0 ? events[events.length - 1] : null;

  const createdAtIso = po.createdAt
    ? (po.createdAt instanceof Date
        ? po.createdAt
        : new Date(po.createdAt as string)
      ).toISOString()
    : new Date().toISOString();

  const updatedAtIso = lastEvent?.createdAt
    ? (lastEvent.createdAt instanceof Date
        ? lastEvent.createdAt
        : new Date(lastEvent.createdAt as string)
      ).toISOString()
    : createdAtIso;

  const firstUser = events.find(
    (e) => e.user && (e.user as Record<string, unknown>).name,
  );
  const createdBy = firstUser
    ? ((firstUser.user as Record<string, unknown>).name as string)
    : 'System';

  return {
    id: po.id as string,
    documentNumber: po.poNumber as string,
    status: po.status as string,
    prId: po.prId as string,
    version: po.version as number,
    supplierId: po.supplierId as string,
    supplier: supplier
      ? {
          id: supplier.id as string,
          name: supplier.name as string,
        }
      : undefined,
    supplierName: (supplier?.name as string) || '',
    warehouseName: (warehouse?.name as string) || '',
    currencyCode: (currency?.code as string) || '',
    currencyId: po.currencyId as string,
    currency: currency
      ? {
          id: currency.id as string,
          code: currency.code as string,
        }
      : undefined,
    exchangeRate: 1.0,
    expectedDate: createdAtIso,
    expectedDeliveryDate: createdAtIso,
    targetWarehouseId: (po.warehouseId as string) || undefined,
    lines,
    supplierTotalAmount: supplierTotalAmount,
    baseTotalAmount: supplierTotalAmount,
    total: supplierTotalAmount,
    notes: '',
    auditLog: [],
    createdAt: createdAtIso,
    createdBy,
    updatedAt: updatedAtIso,
  };
}

function mapPOSummary(po: Record<string, unknown>) {
  const lines = (po.lines as Record<string, unknown>[]) || [];
  const supplier = po.supplier as Record<string, unknown> | null;
  const currency = po.currency as Record<string, unknown> | null;
  const warehouse = po.warehouse as Record<string, unknown> | null;

  const supplierTotalAmount =
    po.totalAmount !== undefined && po.totalAmount !== null
      ? Number(po.totalAmount)
      : lines.reduce(
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
    warehouseName: (warehouse?.name as string) || '',
    currencyCode: (currency?.code as string) || '',
    expectedDate: createdAtIso,
    supplierTotalAmount: supplierTotalAmount,
    createdAt: createdAtIso,
  };
}

@Controller('procurement/purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecureController()
export class PurchaseOrderController {
  constructor(
    private readonly poService: PurchaseOrderService,
    private readonly prisma: PrismaService,
    private readonly scopeValidationService: ScopeValidationService,
    private readonly pdfGeneratorService: PdfGeneratorService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.PROC_OFFICER, Role.PROC_MGR, Role.BRANCH_MGR)
  @Idempotent()
  @ApiIdempotentHeader()
  async create(
    @Body() body: CreatePoDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    const supplierId = body.supplierId;
    const currencyId = body.currencyId;
    const prId = body.prId;

    if (!supplierId || !currencyId) {
      throw new BadRequestException('supplierId and currencyId are required');
    }

    const lines = (body.lines || []).map((line) => {
      const itemId = line.itemId;
      const quantity = line.quantity;
      const unitPrice = line.unitPrice;
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

    if (role !== Role.ADMIN && role !== Role.GM && role !== Role.PROC_MGR) {
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
      {
        supplierId,
        currencyId,
        prId,
        lines,
        isSubmitted: body.isSubmitted,
        warehouseId: body.targetWarehouseId || body.warehouseId,
      },
      userId,
      role,
    );
    return { data: mapPODetail(po) };
  }

  @Get()
  @AllRoles()
  async findAll(
    @Query()
    query: {
      status?: string;
      supplierId?: string;
      search?: string;
      page?: string;
    },
    @ActiveScope('warehouseId') warehouseId?: string,
  ) {
    const result = await this.poService.findAll(
      {
        status: query.status,
        supplierId: query.supplierId,
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

  @Get(':id/pdf')
  @AllRoles()
  async getPdf(
    @Param('id') id: string,
    @Query('locale') locale: 'ar' | 'en' = 'en',
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Res() res: Response,
  ) {
    const po = await this.poService.findOne(id);
    if (po.warehouseId) {
      await this.scopeValidationService.validateWarehouse(
        userId,
        role,
        po.warehouseId,
      );
    } else if (
      role !== Role.ADMIN &&
      role !== Role.GM &&
      role !== Role.PROC_MGR &&
      role !== Role.PROC_OFFICER
    ) {
      throw new ForbiddenException(
        'Access denied: Purchase Order lacks warehouse scope.',
      );
    }

    const buffer = await this.pdfGeneratorService.generatePurchaseOrderPdf(
      id,
      locale,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=PO_${po.poNumber}.pdf`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get(':id')
  @AllRoles()
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    const po = await this.poService.findOne(id);
    if (po.warehouseId) {
      await this.scopeValidationService.validateWarehouse(
        userId,
        role,
        po.warehouseId,
      );
    } else if (
      role !== Role.ADMIN &&
      role !== Role.GM &&
      role !== Role.PROC_MGR &&
      role !== Role.PROC_OFFICER
    ) {
      throw new ForbiddenException(
        'Access denied: Purchase Order lacks warehouse scope.',
      );
    }
    return { data: mapPODetail(po) };
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.PROC_OFFICER, Role.PROC_MGR, Role.BRANCH_MGR)
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
    } else if (
      role !== Role.ADMIN &&
      role !== Role.GM &&
      role !== Role.PROC_MGR &&
      role !== Role.PROC_OFFICER
    ) {
      throw new ForbiddenException(
        'Access denied: Cannot update a Purchase Order lacking warehouse scope.',
      );
    }

    const supplierId = body.supplierId;
    const currencyId = body.currencyId;

    let lines:
      | Array<{
          id?: string;
          itemId: string;
          quantity: number;
          unitPrice: number;
        }>
      | undefined = undefined;
    if (body.lines) {
      lines = body.lines.map((line) => {
        const itemId = line.itemId;
        const quantity = line.quantity;
        const unitPrice = line.unitPrice;
        if (!itemId || quantity === undefined || unitPrice === undefined) {
          throw new BadRequestException(
            'itemId, quantity, and unitPrice are required for each line',
          );
        }
        return {
          id: line.id,
          itemId,
          quantity,
          unitPrice,
        };
      });
    }

    const updated = await this.poService.update(id, {
      supplierId,
      currencyId,
      warehouseId: body.targetWarehouseId || body.warehouseId,
      version: body.version,
      lines,
    });
    return { data: mapPODetail(updated) };
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.PROC_OFFICER, Role.PROC_MGR, Role.BRANCH_MGR)
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
    } else if (
      role !== Role.ADMIN &&
      role !== Role.GM &&
      role !== Role.PROC_MGR &&
      role !== Role.PROC_OFFICER
    ) {
      throw new ForbiddenException(
        'Access denied: Cannot delete a Purchase Order lacking warehouse scope.',
      );
    }
    await this.poService.remove(id, version ? Number(version) : undefined);
    return { success: true };
  }

  @Post(':id/submit')
  @Roles(Role.ADMIN, Role.PROC_OFFICER, Role.PROC_MGR, Role.BRANCH_MGR)
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
  @Roles(Role.ADMIN, Role.GM, Role.BRANCH_MGR, Role.PROC_MGR, Role.APPROVER)
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
  @Roles(Role.ADMIN, Role.GM, Role.BRANCH_MGR, Role.PROC_MGR, Role.APPROVER)
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
  @Roles(Role.ADMIN, Role.PROC_OFFICER, Role.PROC_MGR, Role.BRANCH_MGR)
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
  @AllRoles()
  @HttpCode(HttpStatus.OK)
  async email(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('recipientEmail') recipientEmail?: string,
  ) {
    return this.poService.email(id, userId, recipientEmail);
  }
}
