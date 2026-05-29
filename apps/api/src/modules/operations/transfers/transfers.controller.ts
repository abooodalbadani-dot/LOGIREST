import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TransferPostService } from '../transfer-post.service';
import { TransfersService } from './transfers.service';
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

function mapTransferDetail(transfer: any) {
  const lines = (transfer.lines || []).map((line: any) => ({
    id: line.id,
    document_id: line.transferId,
    item_id: line.itemId,
    item: line.item ? {
      id: line.item.id,
      code: line.item.sku,
      name_ar: line.item.name,
      name_en: line.item.name,
      primary_uom: line.item.unitOfMeasure ? {
        id: line.item.unitOfMeasure.id,
        code: line.item.unitOfMeasure.code,
        name_ar: line.item.unitOfMeasure.name,
        name_en: line.item.unitOfMeasure.name,
      } : { id: '', code: '', name_ar: '', name_en: '' },
    } : { id: '', code: '', name_ar: '', name_en: '', primary_uom: { id: '', code: '', name_ar: '', name_en: '' } },
    lot_id: null,
    lot: null,
    qty: Number(line.quantityShipped),
    shipped_qty: Number(line.quantityShipped),
    received_qty: line.quantityReceived ? Number(line.quantityReceived) : null,
    uom_id: line.item?.uomId || '',
    unit_cost: line.item?.wac ? Number(line.item.wac) : null,
    lot_allocations: [],
  }));

  const isShipped = ['IN_TRANSIT', 'RECEIVED', 'POSTED'].includes(transfer.status);
  const isReceived = ['RECEIVED', 'POSTED'].includes(transfer.status);

  return {
    id: transfer.id,
    document_number: transfer.transferNumber,
    type: 'TRANSFER',
    status: transfer.status,
    transfer_status: transfer.status,
    from_warehouse_id: transfer.fromWarehouseId,
    from_warehouse_name: transfer.fromWarehouse?.name || '',
    to_warehouse_id: transfer.toWarehouseId,
    to_warehouse_name: transfer.toWarehouse?.name || '',
    warehouse_id: transfer.fromWarehouseId,
    branch_id: transfer.fromWarehouse?.branchId || '',
    notes: '',
    shipped_at: isShipped ? transfer.createdAt.toISOString() : null,
    received_at: isReceived ? transfer.createdAt.toISOString() : null,
    variance_reason: null,
    created_by: 'System',
    created_at: transfer.createdAt.toISOString(),
    updated_at: transfer.createdAt.toISOString(),
    posted_at: transfer.status === 'POSTED' ? transfer.createdAt.toISOString() : null,
    posted_by: null,
    version: transfer.version,
    lines,
  };
}

@Controller('operations/transfers')
@ApiSecureController()
export class TransfersController {
  constructor(
    private readonly transferPostService: TransferPostService,
    private readonly transfersService: TransfersService,
  ) {}

  @Throttle({ short: { limit: 50, ttl: 1000 } })
  @Post()
  @Idempotent()
  @ApiIdempotentHeader()
  async create(
    @Body()
    body: {
      fromWarehouseId: string;
      toWarehouseId: string;
      lines: Array<{ itemId: string; quantityShipped: number }>;
    },
    @CurrentUser('id') userId: string,
  ) {
    const transfer = await this.transfersService.create(body, userId);
    return mapTransferDetail(transfer);
  }

  @Get()
  async findAll(
    @Query() query: { status?: string; search?: string; page?: string },
    @ActiveScope('warehouseId') warehouseId?: string,
  ) {
    const result = await this.transfersService.findAll(
      {
        status: query.status,
        search: query.search,
        page: query.page ? Number(query.page) : 1,
      },
      warehouseId,
    );

    return {
      data: result.items.map(mapTransferDetail),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get('summary')
  async getSummary(@ActiveScope('warehouseId') warehouseId?: string) {
    return this.transfersService.getSummary(warehouseId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const transfer = await this.transfersService.findOne(id);
    return mapTransferDetail(transfer);
  }

  @Throttle({ short: { limit: 100, ttl: 60000 } })
  @Post(':id/ship')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'transfer',
    action: 'SHIP',
    modelName: 'transfer',
  })
  @HttpCode(HttpStatus.OK)
  async ship(
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

    const transfer = await this.transferPostService.ship(
      id,
      userId,
      role,
      body.version,
      ipAddress,
    );
    return mapTransferDetail(transfer);
  }

  @Throttle({ short: { limit: 100, ttl: 60000 } })
  @Post(':id/receive')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'transfer',
    action: 'RECEIVE',
    modelName: 'transfer',
  })
  @HttpCode(HttpStatus.OK)
  async receive(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body()
    body: {
      version?: number;
      linesReceived?: Array<{
        lineId: string;
        quantityReceived: number;
        varianceReason?: string;
      }>;
    },
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    const transfer = await this.transferPostService.receive(
      id,
      userId,
      role,
      body.version,
      ipAddress,
      body.linesReceived,
    );
    return mapTransferDetail(transfer);
  }

  @Post(':id/cancel')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'transfer',
    action: 'CANCEL',
    modelName: 'transfer',
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

    const transfer = await this.transfersService.cancel(id, userId, role, {
      ...body,
      ipAddress,
    });
    return mapTransferDetail(transfer);
  }

  @Post(':id/post')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'transfer',
    action: 'POST',
    modelName: 'transfer',
  })
  @HttpCode(HttpStatus.OK)
  async post(
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

    const transfer = await this.transfersService.postToLedger(id, userId, role, {
      ...body,
      ipAddress,
    });
    return mapTransferDetail(transfer);
  }
}
