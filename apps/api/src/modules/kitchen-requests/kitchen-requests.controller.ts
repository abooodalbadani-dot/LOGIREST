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
import { KitchenRequestsService } from './kitchen-requests.service';
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

function mapKitchenRequestDetail(kr: any) {
  const items = (kr.items || []).map((item: any) => ({
    id: item.id,
    item_id: item.itemId,
    item_name: item.item?.name || '',
    uom: item.item?.unitOfMeasure?.code || 'PCS',
    quantity: Number(item.quantityRequested),
    notes: '',
    fulfilled_quantity: Number(item.quantityFulfilled),
  }));

  return {
    id: kr.id,
    request_number: kr.requestNumber,
    department_id: kr.departmentId,
    department_name: kr.department?.name || '',
    warehouse_id: kr.warehouseId,
    warehouse_name: kr.warehouse?.name || '',
    status: kr.status,
    notes: kr.notes || '',
    requested_by: 'System',
    requested_at: kr.createdAt.toISOString(),
    created_at: kr.createdAt.toISOString(),
    updated_at: kr.createdAt.toISOString(),
    version: kr.version,
    items,
  };
}

@Controller('operations/kitchen-requests')
@ApiSecureController()
export class KitchenRequestsController {
  constructor(private readonly krService: KitchenRequestsService) {}

  @Post()
  @Idempotent()
  @ApiIdempotentHeader()
  async create(
    @Body()
    body: {
      departmentId: string;
      warehouseId: string;
      items: Array<{ itemId: string; quantityRequested: number }>;
    },
    @CurrentUser('id') userId: string,
  ) {
    const kr = await this.krService.create(body, userId);
    return { data: mapKitchenRequestDetail(kr) };
  }

  @Get()
  async findAll(
    @Query() query: { status?: string; search?: string; page?: string },
    @ActiveScope('warehouseId') warehouseId?: string,
  ) {
    const result = await this.krService.findAll(
      {
        status: query.status,
        search: query.search,
        page: query.page ? Number(query.page) : 1,
      },
      warehouseId,
    );

    return {
      data: result.items.map(mapKitchenRequestDetail),
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
    const kr = await this.krService.findOne(id);
    return { data: mapKitchenRequestDetail(kr) };
  }

  @Post(':id/submit')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'kitchen_request',
    action: 'SUBMIT',
    modelName: 'kitchenRequest',
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

    const kr = await this.krService.submit(id, userId, role, {
      ...body,
      ipAddress,
    });
    return { data: mapKitchenRequestDetail(kr) };
  }

  @Post(':id/fulfill')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'kitchen_request',
    action: 'FULFILL',
    modelName: 'kitchenRequest',
  })
  @HttpCode(HttpStatus.OK)
  async fulfill(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body()
    body: {
      comments?: string;
      version?: number;
      fulfillments?: Array<{ itemId: string; fulfilledQty: number }>;
    },
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    const kr = await this.krService.fulfill(id, userId, role, {
      ...body,
      ipAddress,
    });
    return { data: mapKitchenRequestDetail(kr) };
  }

  @Post(':id/cancel')
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'kitchen_request',
    action: 'CANCEL',
    modelName: 'kitchenRequest',
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

    const kr = await this.krService.cancel(id, userId, role, {
      ...body,
      ipAddress,
    });
    return { data: mapKitchenRequestDetail(kr) };
  }
}
