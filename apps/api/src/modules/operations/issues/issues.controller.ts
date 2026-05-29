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
import type { Role } from '@logirest/shared-types';
import type { Request } from 'express';

function mapIssueDetail(issue: any) {
  const lines = (issue.lines || []).map((line: any) => {
    const lotAllocations = (line.lotAllocations || []).map((la: any) => ({
      lot_id: la.lotId,
      lot_number: la.lot?.lotNumber || '',
      expiry_date: la.lot?.expiryDate ? la.lot.expiryDate.toISOString() : null,
      allocated_qty: Number(la.quantityAllocated),
      override_reason: '',
    }));

    const firstAllocation = lotAllocations[0] || null;

    return {
      id: line.id,
      document_id: line.issueId,
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
      lot_id: firstAllocation ? firstAllocation.lot_id : null,
      lot: firstAllocation ? {
        id: firstAllocation.lot_id,
        lot_number: firstAllocation.lot_number,
        expiry_date: firstAllocation.expiry_date,
        is_expired: false,
      } : null,
      qty: Number(line.quantity),
      uom_id: line.item?.uomId || '',
      unit_cost: line.item?.wac ? Number(line.item.wac) : null,
      requested_qty: Number(line.quantity),
      issued_qty: Number(line.quantity),
      lot_allocations: lotAllocations,
    };
  });

  return {
    id: issue.id,
    document_number: issue.issueNumber,
    status: issue.status,
    type: 'ISSUE',
    destination_dept_id: issue.departmentId,
    destination_department_id: issue.departmentId,
    requested_by: 'System',
    warehouse_id: issue.warehouseId,
    branch_id: issue.warehouse?.branchId || '',
    notes: issue.notes || '',
    created_by: 'System',
    created_at: issue.createdAt.toISOString(),
    updated_at: issue.createdAt.toISOString(),
    posted_at: issue.status === 'POSTED' ? issue.createdAt.toISOString() : null,
    posted_by: null,
    version: issue.version,
    lines,
  };
}

function mapIssueSummary(issue: any) {
  return {
    id: issue.id,
    document_number: issue.issueNumber,
    status: issue.status,
    destination_dept_id: issue.departmentId,
    warehouse_id: issue.warehouseId,
    created_at: issue.createdAt.toISOString(),
    posted_at: issue.status === 'POSTED' ? issue.createdAt.toISOString() : null,
  };
}

@Controller('operations/issues')
@ApiSecureController()
export class IssuesController {
  constructor(
    private readonly issuePostService: IssuePostService,
    private readonly issuesService: IssuesService,
  ) {}

  @Throttle({ short: { limit: 50, ttl: 1000 } })
  @Post()
  @Idempotent()
  @ApiIdempotentHeader()
  async create(
    @Body()
    body: {
      departmentId: string;
      lines: Array<{ itemId: string; quantity: number }>;
    },
    @CurrentUser('id') userId: string,
    @ActiveScope('warehouseId') warehouseId: string,
  ) {
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
      data: result.items.map(mapIssueSummary),
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
    const issue = await this.issuesService.findOne(id);
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
