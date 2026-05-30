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
import type { Role } from '@logirest/shared-types';
import type { Request } from 'express';

function mapPRDetail(pr: any) {
  const lines = (pr.lines || []).map((line: any) => ({
    id: line.id,
    item: {
      id: line.item?.id || '',
      code: line.item?.sku || '',
      name_ar: line.item?.name || '',
      name_en: line.item?.name || '',
      primary_uom: line.item?.unitOfMeasure
        ? {
            id: line.item.unitOfMeasure.id,
            code: line.item.unitOfMeasure.code,
          }
        : { id: '', code: '' },
    },
    req_qty: Number(line.quantity),
    uom_id: line.item?.uomId || '',
  }));

  return {
    id: pr.id,
    document_number: pr.requestNumber,
    status: pr.status,
    department_id: pr.warehouseId, // Fallback since no department_id is stored directly
    expected_date: pr.createdAt.toISOString(),
    version: pr.version,
    notes: '',
    created_at: pr.createdAt.toISOString(),
    created_by: pr.createdBy?.name || 'System',
    updated_at: pr.createdAt.toISOString(),
    lines,
  };
}

function mapPRSummary(pr: any) {
  return {
    id: pr.id,
    document_number: pr.requestNumber,
    status: pr.status,
    department_id: pr.warehouseId,
    expected_date: pr.createdAt.toISOString(),
    created_at: pr.createdAt.toISOString(),
  };
}

@Controller('procurement/purchase-requests')
@ApiSecureController()
export class PurchaseRequestsController {
  constructor(private readonly prService: PurchaseRequestsService) {}

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
  ) {
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
      data: result.items.map(mapPRSummary),
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
    const pr = await this.prService.findOne(id);
    return { data: mapPRDetail(pr) };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      version: number;
      lines?: Array<{ itemId: string; quantity: number }>;
    },
  ) {
    const lines = body.lines?.map((line: any) => ({
      itemId: line.itemId || line.item_id,
      quantity: line.quantity || line.req_qty,
    }));

    const pr = await this.prService.update(id, {
      version: body.version,
      lines,
    });
    return { data: mapPRDetail(pr) };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Query('version') version?: string) {
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
    @CurrentUser('role') role: any,
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
    @CurrentUser('role') role: any,
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
    @CurrentUser('role') role: any,
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
    @CurrentUser('role') role: any,
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
    @CurrentUser('role') role: any,
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
