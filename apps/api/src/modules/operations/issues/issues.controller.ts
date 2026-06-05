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
          lot_id: la.lotId as string,
          lot_number: (lot?.lotNumber as string) || '',
          expiry_date: expiryDateVal
            ? (expiryDateVal instanceof Date
                ? expiryDateVal
                : new Date(expiryDateVal)
              ).toISOString()
            : null,
          allocated_qty: Number(la.quantityAllocated),
          override_reason: '',
        };
      });

      const firstAllocation = lotAllocations[0] || null;
      const item = line.item as Record<string, unknown> | undefined;

      return {
        id: line.id as string,
        document_id: line.issueId as string,
        item_id: line.itemId as string,
        item: item
          ? {
              id: item.id as string,
              code: item.sku as string,
              name_ar: item.name as string,
              name_en: item.name as string,
              primary_uom: item.unitOfMeasure
                ? {
                    id: (item.unitOfMeasure as Record<string, unknown>)
                      .id as string,
                    code: (item.unitOfMeasure as Record<string, unknown>)
                      .code as string,
                    name_ar: (item.unitOfMeasure as Record<string, unknown>)
                      .name as string,
                    name_en: (item.unitOfMeasure as Record<string, unknown>)
                      .name as string,
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
        lot_id: firstAllocation ? firstAllocation.lot_id : null,
        lot: firstAllocation
          ? {
              id: firstAllocation.lot_id,
              lot_number: firstAllocation.lot_number,
              expiry_date: firstAllocation.expiry_date,
              is_expired: false,
            }
          : null,
        qty: Number(line.quantity),
        uom_id: (item?.uomId as string) || '',
        unit_cost: item?.wac ? Number(item.wac) : null,
        requested_qty: Number(line.quantity),
        issued_qty: Number(line.quantity),
        lot_allocations: lotAllocations,
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

  return {
    id: issue.id as string,
    document_number: issue.issueNumber as string,
    status: issue.status as string,
    type: 'ISSUE',
    destination_dept_id: issue.departmentId as string,
    destination_department_id: issue.departmentId as string,
    requested_by: 'System',
    warehouse_id: issue.warehouseId as string,
    branch_id:
      ((issue.warehouse as Record<string, unknown> | undefined)
        ?.branchId as string) || '',
    notes: (issue.notes as string) || '',
    created_by: 'System',
    created_at: createdAtIso,
    updated_at: createdAtIso,
    posted_at:
      issue.status === 'POSTED' && createdAtVal
        ? (createdAtVal instanceof Date
            ? createdAtVal
            : new Date(createdAtVal)
          ).toISOString()
        : null,
    posted_by: null,
    version: issue.version as number,
    lines,
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
  return {
    id: issue.id as string,
    document_number: issue.issueNumber as string,
    status: issue.status as string,
    destination_dept_id: issue.departmentId as string,
    warehouse_id: issue.warehouseId as string,
    created_at: createdAtIso,
    posted_at: issue.status === 'POSTED' ? createdAtIso : null,
  };
}

@Controller('operations/issues')
@ApiSecureController()
export class IssuesController {
  constructor(
    private readonly issuePostService: IssuePostService,
    private readonly issuesService: IssuesService,
    private readonly scopeValidationService: ScopeValidationService,
  ) {}

  @Throttle({ short: { limit: 50, ttl: 1000 } })
  @Post()
  @Idempotent()
  @ApiIdempotentHeader()
  async create(
    @Body()
    body: {
      departmentId: string;
      warehouseId?: string;
      lines: Array<{ itemId: string; quantity: number }>;
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
    const issue = await this.issuesService.create(body, userId, warehouseId);
    return mapIssueDetail(issue);
  }

  @Get()
  async findAll(
    @Query() query: { status?: string; search?: string; page?: string },
    @ActiveScope('warehouseId') warehouseId?: string,
  ) {
    const result = await this.issuesService.findAll(
      {
        status: query.status,
        search: query.search,
        page: query.page ? Number(query.page) : 1,
      },
      warehouseId,
    );

    return {
      data: result.data.map(mapIssueSummary),
      meta: result.meta,
    };
  }

  @Get(':id')
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
