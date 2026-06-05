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
import { Role } from '@prisma/client';
import { ScopeValidationService } from '../../../auth/scope-validation.service';
import type { Request } from 'express';

function mapTransferDetail(transfer: Record<string, unknown>) {
  const fromWarehouse = transfer.fromWarehouse as Record<
    string,
    unknown
  > | null;
  const toWarehouse = transfer.toWarehouse as Record<string, unknown> | null;

  const lines = ((transfer.lines as Record<string, unknown>[]) || []).map(
    (line: Record<string, unknown>) => {
      const item = line.item as Record<string, unknown> | null;
      const unitOfMeasure = item?.unitOfMeasure as Record<
        string,
        unknown
      > | null;
      return {
        id: line.id as string,
        document_id: line.transferId as string,
        item_id: line.itemId as string,
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
                    name_ar: unitOfMeasure.name as string,
                    name_en: unitOfMeasure.name as string,
                  }
                : { id: '', code: '', name_ar: '', name_en: '' },
            }
          : {
              id: '',
              code: '',
              name_ar: '',
              name_en: '',
              primary_uom: { id: '', code: '', name_ar: '', name_en: '' },
            },
        lot_id: null,
        lot: null,
        qty: Number(line.quantityShipped),
        shipped_qty: Number(line.quantityShipped),
        received_qty: line.quantityReceived
          ? Number(line.quantityReceived)
          : null,
        uom_id: (item?.uomId as string) || '',
        unit_cost: item?.wac ? Number(item.wac) : null,
        lot_allocations: [],
      };
    },
  );

  const isShipped = ['IN_TRANSIT', 'RECEIVED', 'POSTED'].includes(
    transfer.status as string,
  );
  const isReceived = ['RECEIVED', 'POSTED'].includes(transfer.status as string);

  const createdAtIso = transfer.createdAt
    ? (transfer.createdAt instanceof Date
        ? transfer.createdAt
        : new Date(transfer.createdAt as string)
      ).toISOString()
    : new Date().toISOString();

  return {
    id: transfer.id as string,
    document_number: transfer.transferNumber as string,
    type: 'TRANSFER',
    status: transfer.status as string,
    transfer_status: transfer.status as string,
    from_warehouse_id: transfer.fromWarehouseId as string,
    from_warehouse_name: (fromWarehouse?.name as string) || '',
    to_warehouse_id: transfer.toWarehouseId as string,
    to_warehouse_name: (toWarehouse?.name as string) || '',
    warehouse_id: transfer.fromWarehouseId as string,
    branch_id: (fromWarehouse?.branchId as string) || '',
    notes: '',
    shipped_at: isShipped ? createdAtIso : null,
    received_at: isReceived ? createdAtIso : null,
    variance_reason: null,
    created_by: 'System',
    created_at: createdAtIso,
    updated_at: createdAtIso,
    posted_at: transfer.status === 'POSTED' ? createdAtIso : null,
    posted_by: null,
    version: transfer.version as number,
    lines,
  };
}

@Controller('operations/transfers')
@ApiSecureController()
export class TransfersController {
  constructor(
    private readonly transferPostService: TransferPostService,
    private readonly transfersService: TransfersService,
    private readonly scopeValidationService: ScopeValidationService,
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
    @CurrentUser('role') role: Role,
  ) {
    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      body.fromWarehouseId,
    );
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
      data: result.data.map(mapTransferDetail),
      meta: result.meta,
    };
  }

  @Get('summary')
  async getSummary(@ActiveScope('warehouseId') warehouseId?: string) {
    return this.transfersService.getSummary(warehouseId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    const transfer = await this.transfersService.findOne(id);
    await this.scopeValidationService.validateAtLeastOneWarehouse(
      userId,
      role,
      [transfer.fromWarehouseId, transfer.toWarehouseId],
    );
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
    const t = await this.transfersService.findOne(id);
    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      t.fromWarehouseId,
    );

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
    const t = await this.transfersService.findOne(id);
    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      t.toWarehouseId,
    );

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
    const t = await this.transfersService.findOne(id);
    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      t.fromWarehouseId,
    );

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
    const t = await this.transfersService.findOne(id);
    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      t.toWarehouseId,
    );

    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    const transfer = await this.transfersService.postToLedger(
      id,
      userId,
      role,
      {
        ...body,
        ipAddress,
      },
    );
    return mapTransferDetail(transfer);
  }
}
