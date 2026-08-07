import {
  Controller,
  Post,
  Get,
  Put,
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
import { UpdateKitchenRequestDto } from './dto/update-kitchen-request.dto';
import { CreateKitchenRequestDto } from './dto/create-kitchen-request.dto';
import { Role } from '@prisma/client';
import { ScopeValidationService } from '../../auth/scope-validation.service';
import { PrismaService } from '../../database/prisma.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AllRoles } from '../../auth/decorators/all-roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { Request } from 'express';

function mapKitchenRequestDetail(
  kr: Record<string, unknown>,
  currentUserId?: string,
) {
  const krItems = (kr.items as Record<string, unknown>[]) || [];
  const department = kr.department as Record<string, unknown> | null;
  const warehouse = kr.warehouse as Record<string, unknown> | null;
  const requestedBy = kr.requestedBy as Record<string, unknown> | null;

  const items = krItems.map((item: Record<string, unknown>) => {
    const it = item.item as Record<string, unknown> | null;
    const unitOfMeasure = it?.unitOfMeasure as Record<string, unknown> | null;
    const lineUom = item.uom as Record<string, unknown> | null;
    const resolvedUom =
      (lineUom?.code as string) || (unitOfMeasure?.code as string) || 'PCS';
    const rawConversions = (it?.uomConversions as Array<Record<string, unknown>>) || [];
    const uomConversions = rawConversions.map((c) => {
      const fromUom = c.fromUom as Record<string, unknown> | null;
      const toUom = c.toUom as Record<string, unknown> | null;
      return {
        fromUomId: (c.fromUomId as string) || (fromUom?.id as string) || '',
        toUomId: (c.toUomId as string) || (toUom?.id as string) || '',
        factor: Number(c.factor || 1),
        fromUomCode: (c.fromUomCode as string) || (fromUom?.code as string) || '',
        fromUomName: (c.fromUomName as string) || (fromUom?.name as string) || '',
        toUomCode: (c.toUomCode as string) || (toUom?.code as string) || '',
        toUomName: (c.toUomName as string) || (toUom?.name as string) || '',
      };
    });
    const targetUomId = (item.uomId as string) || (unitOfMeasure?.id as string) || null;
    const rawBarcodeMappings = (it?.barcodeMappings as Array<Record<string, unknown>>) || [];
    const matchingBarcodeObj = rawBarcodeMappings.find((bm) => (bm.uomId as string) === targetUomId) || rawBarcodeMappings[0];
    const resolvedBarcode = (matchingBarcodeObj?.barcode as string) || (it?.sku as string) || '';

    return {
      id: item.id as string,
      itemId: item.itemId as string,
      itemName: (it?.name as string) || '',
      itemCode: (it?.sku as string) || '',
      barcode: resolvedBarcode,
      itemBarcode: resolvedBarcode,
      uom: resolvedUom,
      uomId: targetUomId,
      uomConversions,
      image: (it?.image as string) || null,
      itemImage: (it?.image as string) || null,
      quantity: Number(item.quantityRequested),
      notes: (item.notes as string) || '',
      fulfilledQuantity: Number(item.quantityFulfilled),
    };
  });

  const events =
    (kr.approvalEvents as Array<Record<string, unknown>>) || [];
  const lastEvent = events.length > 0 ? events[events.length - 1] : null;

  const createdAtIso = kr.createdAt
    ? (kr.createdAt instanceof Date
        ? kr.createdAt
        : new Date(kr.createdAt as string)
      ).toISOString()
    : new Date().toISOString();

  const updatedAtIso = lastEvent?.createdAt
    ? (lastEvent.createdAt instanceof Date
        ? lastEvent.createdAt
        : new Date(lastEvent.createdAt as string)
      ).toISOString()
    : createdAtIso;

  const requestedByName =
    (requestedBy?.name as string) || currentUserId || 'System';

  return {
    id: kr.id as string,
    requestNumber: kr.requestNumber as string,
    departmentId: kr.departmentId as string,
    departmentName: (department?.name as string) || '',
    warehouseId: kr.warehouseId as string,
    warehouseName: (warehouse?.name as string) || '',
    status: kr.status as string,
    notes: (kr.notes as string) || '',
    requestedBy: requestedByName,
    requestedAt: createdAtIso,
    createdAt: createdAtIso,
    updatedAt: updatedAtIso,
    version: kr.version as number,
    issueId: (kr.issueId as string) || null,
    issueDocument: kr.inventoryIssue
      ? {
          id: (kr.inventoryIssue as Record<string, unknown>).id as string,
          issueNumber: (kr.inventoryIssue as Record<string, unknown>).issueNumber as string,
          status: (kr.inventoryIssue as Record<string, unknown>).status as string,
        }
      : null,
    items,
  };
}

@Controller('operations/kitchen-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecureController()
export class KitchenRequestsController {
  constructor(
    private readonly krService: KitchenRequestsService,
    private readonly scopeValidationService: ScopeValidationService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles(
    Role.ADMIN,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
    Role.KITCHEN_CHIEF,
  )
  @Idempotent()
  @ApiIdempotentHeader()
  async create(
    @Body() dto: CreateKitchenRequestDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    if (role === Role.KITCHEN_CHIEF) {
      await this.scopeValidationService.validateDepartment(
        userId,
        role,
        dto.departmentId,
      );
    } else {
      await this.scopeValidationService.validateWarehouse(
        userId,
        role,
        dto.warehouseId,
      );
    }
    const kr = await this.krService.create(dto, userId);
    return { data: mapKitchenRequestDetail(kr, userId) };
  }

  @Get()
  @AllRoles()
  async findAll(
    @Query()
    query: { status?: string; search?: string; page?: string; limit?: string },
    @ActiveScope()
    activeScope?: {
      branchId?: string;
      warehouseId?: string;
      departmentId?: string;
    },
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    const result = await this.krService.findAll(
      {
        status: query.status,
        search: query.search,
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : undefined,
      },
      activeScope,
      user,
    );

    return {
      data: result.data.map((kr) => mapKitchenRequestDetail(kr)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @AllRoles()
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    const kr = await this.krService.findOne(id);
    if (role === Role.KITCHEN_CHIEF) {
      await this.scopeValidationService.validateDepartment(
        userId,
        role,
        kr.departmentId,
      );
    } else {
      await this.scopeValidationService.validateWarehouse(
        userId,
        role,
        kr.warehouseId,
      );
    }
    return { data: mapKitchenRequestDetail(kr, userId) };
  }

  @Put(':id')
  @Roles(
    Role.ADMIN,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
    Role.KITCHEN_CHIEF,
  )
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'kitchen_request',
    action: 'EDIT',
    modelName: 'kitchenRequest',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateKitchenRequestDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Req() req: Request,
  ) {
    const kr = await this.prisma.kitchenRequest.findUnique({
      where: { id },
      select: { warehouseId: true, departmentId: true },
    });
    if (kr) {
      if (role === Role.KITCHEN_CHIEF) {
        await this.scopeValidationService.validateDepartment(
          userId,
          role,
          dto.departmentId || kr.departmentId,
        );
      } else {
        await this.scopeValidationService.validateWarehouse(
          userId,
          role,
          dto.warehouseId || kr.warehouseId,
        );
      }
    }

    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    const updated = await this.krService.update(id, dto, userId, ipAddress);
    return { data: mapKitchenRequestDetail(updated, userId) };
  }

  @Post(':id/submit')
  @Roles(
    Role.ADMIN,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
    Role.KITCHEN_CHIEF,
  )
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
    return { data: mapKitchenRequestDetail(kr, userId) };
  }

  @Post(':id/fulfill')
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.WH_KEEPER,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
  )
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
    return { data: mapKitchenRequestDetail(kr, userId) };
  }

  @Post(':id/cancel')
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.WH_KEEPER,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
    Role.KITCHEN_CHIEF,
  )
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
    return { data: mapKitchenRequestDetail(kr, userId) };
  }
}
