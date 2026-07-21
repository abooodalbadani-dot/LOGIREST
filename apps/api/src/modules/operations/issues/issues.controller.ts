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
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IssuePostService } from '../issue-post.service';
import { IssuesService } from './issues.service';
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
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { AllRoles } from '../../../auth/decorators/all-roles.decorator';
import type { Request } from 'express';

function mapIssueDetail(issue: Record<string, unknown>) {
  const lines = ((issue.lines as Record<string, unknown>[]) || []).map(
    (line: Record<string, unknown>) => {
      const lotAllocations = (
        (line.lotAllocations as Record<string, unknown>[]) || []
      ).map((la: Record<string, unknown>) => {
        const lot = la.lot as Record<string, unknown> | undefined;
        const expiryDateVal = lot?.expiryDate as
          | Date
          | string
          | number
          | undefined;
        return {
          lotId: la.lotId as string,
          lotNumber: (lot?.lotNumber as string) || '',
          expiryDate: expiryDateVal
            ? (expiryDateVal instanceof Date
                ? expiryDateVal
                : new Date(expiryDateVal)
              ).toISOString()
            : null,
          allocatedQty: Number(la.quantityAllocated),
          overrideReason: '',
        };
      });

      const firstAllocation = lotAllocations[0] || null;
      const item = line.item as Record<string, unknown> | undefined;

      return {
        id: line.id as string,
        documentId: line.issueId as string,
        itemId: line.itemId as string,
        item: item
          ? {
              id: item.id as string,
              code: item.sku as string,
              nameAr: item.name as string,
              nameEn: item.name as string,
              image: (item.image as string) || null,
              primaryUom: item.unitOfMeasure
                ? {
                    id: (item.unitOfMeasure as Record<string, unknown>)
                      .id as string,
                    code: (item.unitOfMeasure as Record<string, unknown>)
                      .code as string,
                    nameAr: (item.unitOfMeasure as Record<string, unknown>)
                      .name as string,
                    nameEn: (item.unitOfMeasure as Record<string, unknown>)
                      .name as string,
                  }
                : { id: '', code: '', nameAr: '', nameEn: '' },
            }
          : {
              id: '',
              code: '',
              nameAr: '',
              nameEn: '',
              image: null,
              primaryUom: { id: '', code: '', nameAr: '', nameEn: '' },
            },
        lotId: firstAllocation ? firstAllocation.lotId : null,
        lot: firstAllocation
          ? {
              id: firstAllocation.lotId,
              lotNumber: firstAllocation.lotNumber,
              expiryDate: firstAllocation.expiryDate,
              isExpired: false,
            }
          : null,
        qty: Number(line.quantity),
        uomId: (item?.uomId as string) || '',
        unitCost: item?.wac ? Number(item.wac) : null,
        requestedQty: Number(line.quantity),
        issuedQty: Number(line.quantity),
        lotAllocations: lotAllocations,
      };
    },
  );

  const createdAtVal = issue.createdAt as Date | string | number | undefined;
  const createdAtIso = createdAtVal
    ? (createdAtVal instanceof Date
        ? createdAtVal
        : new Date(createdAtVal)
      ).toISOString()
    : new Date().toISOString();

  const warehouse = issue.warehouse as Record<string, unknown> | null;
  const department = issue.department as Record<string, unknown> | null;
  const kitchenRequest = issue.kitchenRequest as Record<string, unknown> | null;

  return {
    id: issue.id as string,
    documentNumber: issue.issueNumber as string,
    status: issue.status as string,
    type: 'ISSUE',
    destinationDeptId: issue.departmentId as string,
    destinationDepartmentId: issue.departmentId as string,
    destinationDepartmentName: (department?.name as string) || '',
    departmentName: (department?.name as string) || '',
    requestedBy:
      ((issue.createdBy as Record<string, unknown>)?.name as string) ||
      'System',
    warehouseId: issue.warehouseId as string,
    warehouseName: (warehouse?.name as string) || '',
    branchId:
      ((issue.warehouse as Record<string, unknown> | undefined)
        ?.branchId as string) || '',
    notes: (issue.notes as string) || '',
    createdBy:
      ((issue.createdBy as Record<string, unknown>)?.name as string) ||
      'System',
    createdAt: createdAtIso,
    updatedAt: (() => {
      const events = (issue.approvalEvents as Array<Record<string, unknown>>) || [];
      const lastEvent = events.length > 0 ? events[0] : null; // approvalEvents sorted desc in findOne
      return lastEvent?.createdAt
        ? (lastEvent.createdAt instanceof Date
            ? lastEvent.createdAt
            : new Date(lastEvent.createdAt as string)
          ).toISOString()
        : createdAtIso;
    })(),
    postedAt: issue.postedAt
      ? (issue.postedAt instanceof Date
          ? issue.postedAt
          : new Date(issue.postedAt as string | number)
        ).toISOString()
      : null,
    postedBy: null,
    version: issue.version as number,
    lines,
    kitchenRequest: kitchenRequest
      ? {
          id: kitchenRequest.id as string,
          requestNumber: kitchenRequest.requestNumber as string,
        }
      : null,
  };
}

function mapIssueSummary(issue: Record<string, unknown>) {
  const createdAtVal = issue.createdAt as Date | string | number | undefined;
  const createdAtIso = createdAtVal
    ? (createdAtVal instanceof Date
        ? createdAtVal
        : new Date(createdAtVal)
      ).toISOString()
    : new Date().toISOString();

  const warehouse = issue.warehouse as Record<string, unknown> | null;
  const department = issue.department as Record<string, unknown> | null;

  return {
    id: issue.id as string,
    documentNumber: issue.issueNumber as string,
    status: issue.status as string,
    destinationDeptId: issue.departmentId as string,
    destinationDepartmentName: (department?.name as string) || '',
    departmentName: (department?.name as string) || '',
    warehouseId: issue.warehouseId as string,
    warehouseName: (warehouse?.name as string) || '',
    createdAt: createdAtIso,
    postedAt: issue.postedAt
      ? (issue.postedAt instanceof Date
          ? issue.postedAt
          : new Date(issue.postedAt as string | number)
        ).toISOString()
      : null,
  };
}

@Controller('operations/issues')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecureController()
export class IssuesController {
  constructor(
    private readonly issuePostService: IssuePostService,
    private readonly issuesService: IssuesService,
    private readonly scopeValidationService: ScopeValidationService,
  ) {}

  @Throttle({ short: { limit: 50, ttl: 1000 } })
  @Post()
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.WH_KEEPER,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
    Role.KITCHEN_CHIEF,
  )
  @Idempotent()
  @ApiIdempotentHeader()
  async create(
    @Body()
    body: {
      destinationDeptId?: string;
      departmentId?: string;
      warehouseId?: string;
      lines: Array<{
        itemId: string;
        requestedQty?: number;
        quantity?: number;
        lotAllocations?: Array<{
          lotId?: string;
          lotNumber?: string;
          allocatedQty?: number;
          quantityAllocated?: number;
        }>;
      }>;
      notes?: string;
      kitchenRequestId?: string;
    },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @ActiveScope('warehouseId') headerWarehouseId?: string,
  ) {
    const warehouseId = body.warehouseId || headerWarehouseId;
    if (!warehouseId) {
      throw new BadRequestException('Warehouse ID is required');
    }
    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      warehouseId,
    );

    const departmentId = body.destinationDeptId || body.departmentId;
    if (!departmentId) {
      throw new BadRequestException('Department ID is required');
    }

    if (!body.lines || !Array.isArray(body.lines) || body.lines.length === 0) {
      throw new BadRequestException('At least one line item is required');
    }

    const lines = body.lines.map((line) => {
      const qty =
        line.requestedQty !== undefined ? line.requestedQty : line.quantity;
      if (qty === undefined || qty === null) {
        throw new BadRequestException(
          `Quantity is required for item ${line.itemId}`,
        );
      }

      const rawAllocations = line.lotAllocations || [];
      const lotAllocations: Array<{
        lotId?: string;
        lotNumber?: string;
        quantityAllocated: number;
      }> = [];

      for (const alloc of rawAllocations) {
        const quantityAllocated = Number(
          alloc.quantityAllocated ?? alloc.allocatedQty ?? 0,
        );
        if (quantityAllocated > 0) {
          lotAllocations.push({
            lotId: alloc.lotId,
            lotNumber: alloc.lotNumber,
            quantityAllocated,
          });
        }
      }

      return {
        itemId: line.itemId,
        quantity: Number(qty),
        lotAllocations,
      };
    });

    const issue = await this.issuesService.create(
      {
        departmentId,
        lines,
        kitchenRequestId: body.kitchenRequestId,
        notes: body.notes,
      },
      userId,
      warehouseId,
    );
    return mapIssueDetail(issue);
  }

  @Get()
  @AllRoles()
  async findAll(
    @Query() query: { status?: string; search?: string; page?: string; limit?: string },
    @ActiveScope()
    activeScope?: {
      branchId?: string;
      warehouseId?: string;
      departmentId?: string;
    },
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    const result = await this.issuesService.findAll(
      {
        status: query.status,
        search: query.search,
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 20,
      },
      activeScope,
      user,
    );

    return {
      data: result.data.map(mapIssueSummary),
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
    const issue = await this.issuesService.findOne(id);
    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      issue.warehouseId,
    );
    return mapIssueDetail(issue);
  }

  @Post(':id/submit')
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.WH_KEEPER,
    Role.STORE_MGR,
    Role.KITCHEN_CHIEF,
    Role.BRANCH_MGR,
  )
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'issue',
    action: 'SUBMIT',
    modelName: 'inventoryIssue',
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

    const issue = await this.issuesService.submit(id, userId, role, {
      ...body,
      ipAddress,
    });
    return mapIssueDetail(issue);
  }

  @Post(':id/cancel')
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.WH_KEEPER,
    Role.STORE_MGR,
    Role.KITCHEN_CHIEF,
    Role.BRANCH_MGR,
  )
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'issue',
    action: 'CANCEL',
    modelName: 'inventoryIssue',
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

    const issue = await this.issuesService.cancel(id, userId, role, {
      ...body,
      ipAddress,
    });
    return mapIssueDetail(issue);
  }

  @Throttle({ short: { limit: 100, ttl: 60000 } })
  @Post(':id/post')
  @Roles(Role.ADMIN, Role.INV_MGR, Role.BRANCH_MGR)
  @UseGuards(WorkflowStateGuard)
  @WorkflowAction({
    docType: 'issue',
    action: 'POST',
    modelName: 'inventoryIssue',
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

    const issue = await this.issuePostService.post(
      id,
      userId,
      role,
      body.version,
      ipAddress,
    );
    return mapIssueDetail(issue);
  }
}
