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
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PurchaseRequestsService } from './purchase-requests.service';
import { PdfGeneratorService } from '../pdf/pdf-generator.service';
import { WorkflowStateGuard } from '../../guards/workflow-state.guard';
import { WorkflowAction } from '../../decorators/workflow-action.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ActiveScope } from '../../auth/decorators/active-scope.decorator';
import { Idempotent } from '../../decorators/idempotent.decorator';
import {
  ApiSecureController,
  ApiIdempotentHeader,
} from '../../decorators/swagger-docs.decorator';
import { Role } from '@prisma/client';
import { ScopeValidationService } from '../../auth/scope-validation.service';
import { PrismaService } from '../../database/prisma.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AllRoles } from '../../auth/decorators/all-roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';
import type { Request, Response } from 'express';

export function parsePRNotesAndExpectedDate(rawNotes: string | null | undefined, createdAtIso: string) {
  if (!rawNotes) {
    return { expectedDate: createdAtIso, notes: '' };
  }
  const match = rawNotes.match(/^\[EXPECTED_DATE:([^\]]+)\]\n?(.*)/s);
  if (match) {
    const dateStr = match[1];
    const notesContent = match[2] || '';
    const parsedDate = new Date(dateStr);
    const expectedDate = !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : createdAtIso;
    return { expectedDate, notes: notesContent };
  }
  return { expectedDate: createdAtIso, notes: rawNotes };
}

export function formatPRNotesWithExpectedDate(notes: string | undefined | null, expectedDate: string | undefined | null, existingRawNotes?: string | null): string | null {
  let cleanNotes = (notes !== undefined ? (notes || '') : '').trim();
  let targetExpectedDate = expectedDate;

  if (existingRawNotes && (expectedDate === undefined || notes === undefined)) {
    const parsed = parsePRNotesAndExpectedDate(existingRawNotes, '');
    if (notes === undefined) cleanNotes = parsed.notes;
    if (expectedDate === undefined) targetExpectedDate = parsed.expectedDate;
  }

  if (!targetExpectedDate || targetExpectedDate.trim() === '') {
    return cleanNotes || null;
  }
  const dateOnly = targetExpectedDate.split('T')[0];
  if (cleanNotes) {
    return `[EXPECTED_DATE:${dateOnly}]\n${cleanNotes}`;
  }
  return `[EXPECTED_DATE:${dateOnly}]`;
}

function mapPRDetail(pr: Record<string, unknown>) {
  const prLines = (pr.lines as Record<string, unknown>[]) || [];
  const createdBy = pr.createdBy as Record<string, unknown> | null;
  const warehouse = pr.warehouse as Record<string, unknown> | null;
  const branch = pr.branch as Record<string, unknown> | null;

  const lines = prLines.map((line: Record<string, unknown>) => {
    const item = line.item as Record<string, unknown> | null;
    const unitOfMeasure = item?.unitOfMeasure as Record<string, unknown> | null;
    const rawConversions = (item?.uomConversions as Array<Record<string, unknown>>) || [];
    const lineUom = line.uom as Record<string, unknown> | null;

    return {
      id: line.id as string,
      item: {
        id: (item?.id as string) || '',
        code: (item?.sku as string) || '',
        name: (item?.name as string) || '',
        nameAr: (item?.name as string) || '',
        nameEn: (item?.name as string) || '',
        image: (item?.image as string) || null,
        primaryUom: unitOfMeasure
          ? {
              id: unitOfMeasure.id as string,
              code: unitOfMeasure.code as string,
              name: (unitOfMeasure.name as string) || (unitOfMeasure.code as string),
            }
          : { id: '', code: '' },
        uomConversions: rawConversions.map((c) => ({
          fromUomId: ((c.fromUom as Record<string, unknown>)?.id as string) || (c.fromUomId as string) || '',
          fromUomCode: ((c.fromUom as Record<string, unknown>)?.code as string) || '',
          fromUomName: ((c.fromUom as Record<string, unknown>)?.name as string) || '',
          toUomId: ((c.toUom as Record<string, unknown>)?.id as string) || (c.toUomId as string) || '',
          toUomCode: ((c.toUom as Record<string, unknown>)?.code as string) || '',
          toUomName: ((c.toUom as Record<string, unknown>)?.name as string) || '',
          factor: Number(c.factor),
        })),
      },
      reqQty: Number(line.quantity),
      quantity: Number(line.quantity),
      uomId: (line.uomId as string) || (unitOfMeasure?.id as string) || '',
      uom: lineUom
        ? {
            id: lineUom.id as string,
            code: lineUom.code as string,
            name: (lineUom.name as string) || (lineUom.code as string),
          }
        : unitOfMeasure
          ? {
              id: unitOfMeasure.id as string,
              code: unitOfMeasure.code as string,
              name: (unitOfMeasure.name as string) || (unitOfMeasure.code as string),
            }
          : null,
    };
  });

  const events =
    (pr.approvalEvents as Array<Record<string, unknown>>) || [];
  const lastEvent = events.length > 0 ? events[events.length - 1] : null;

  const createdAtIso = pr.createdAt
    ? (pr.createdAt instanceof Date
        ? pr.createdAt
        : new Date(pr.createdAt as string)
      ).toISOString()
    : new Date().toISOString();

  const updatedAtIso = lastEvent?.createdAt
    ? (lastEvent.createdAt instanceof Date
        ? lastEvent.createdAt
        : new Date(lastEvent.createdAt as string)
      ).toISOString()
    : createdAtIso;

  const parsedNotesAndDate = parsePRNotesAndExpectedDate(pr.notes as string | null, createdAtIso);

  return {
    id: pr.id as string,
    documentNumber: pr.requestNumber as string,
    status: pr.status as string,
    departmentId: (pr.departmentId as string) || (pr.warehouseId as string),
    warehouseId: pr.warehouseId as string,
    warehouseName: (warehouse?.name as string) || null,
    branchId: (pr.branchId as string) || null,
    branchName: (branch?.name as string) || null,
    expectedDate: parsedNotesAndDate.expectedDate,
    version: pr.version as number,
    notes: parsedNotesAndDate.notes,
    createdAt: createdAtIso,
    createdBy: (createdBy?.name as string) || 'System',
    updatedAt: updatedAtIso,
    lines,
    approvalEvents: events.map((e) => {
      const user = e.user as Record<string, unknown> | null;
      return {
        id: e.id as string,
        action: ((e.actionPerformed || e.action) as string) || '',
        comments: (e.comments as string) || null,
        createdAt: (
          e.createdAt instanceof Date
            ? e.createdAt
            : new Date(e.createdAt as string)
        ).toISOString(),
        user: user
          ? {
              name: (user.name as string) || null,
              role: (user.role as string) || null,
            }
          : null,
      };
    }),
  };
}

function mapPRSummary(pr: Record<string, unknown>) {
  const createdAtIso = pr.createdAt
    ? (pr.createdAt instanceof Date
        ? pr.createdAt
        : new Date(pr.createdAt as string)
      ).toISOString()
    : new Date().toISOString();

  const warehouse = pr.warehouse as Record<string, unknown> | null;
  const branch = pr.branch as Record<string, unknown> | null;
  const createdBy = pr.createdBy as Record<string, unknown> | null;

  return {
    id: pr.id as string,
    documentNumber: pr.requestNumber as string,
    status: pr.status as string,
    departmentId: (pr.departmentId as string) || (pr.warehouseId as string),
    warehouseId: pr.warehouseId as string,
    warehouseName: (warehouse?.name as string) || null,
    branchId: (pr.branchId as string) || null,
    branchName: (branch?.name as string) || null,
    expectedDate: createdAtIso,
    createdAt: createdAtIso,
    createdBy: (createdBy?.name as string) || 'System',
  };
}

@Controller('procurement/purchase-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecureController()
export class PurchaseRequestsController {
  constructor(
    private readonly prService: PurchaseRequestsService,
    private readonly scopeValidationService: ScopeValidationService,
    private readonly prisma: PrismaService,
    private readonly pdfGeneratorService: PdfGeneratorService,
  ) {}

  @Get(':id/pdf')
  @AllRoles()
  async getPdf(
    @Param('id') id: string,
    @Query('locale') locale: 'ar' | 'en' = 'en',
    @Res() res: Response,
  ) {
    const pr = await this.prService.findOne(id);
    const buffer = await this.pdfGeneratorService.generatePurchaseRequestPdf(
      id,
      locale,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=PR_${pr.requestNumber}.pdf`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post()
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.PROC_OFFICER,
    Role.PROC_MGR,
    Role.BRANCH_MGR,
  )
  @Idempotent()
  @ApiIdempotentHeader()
  async create(
    @Body() body: CreatePurchaseRequestDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    const branchId = body.branchId;
    const warehouseId = body.warehouseId;
    const departmentId = body.departmentId;
    const notes = body.notes;
    const lines = (body.lines || []).map((line) => ({
      itemId: line.itemId,
      quantity: Number(line.quantity),
      uomId: line.uomId,
    }));

    const formattedNotes = formatPRNotesWithExpectedDate(body.notes, body.expectedDate) || undefined;
    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      warehouseId,
    );
    const pr = await this.prService.create(
      { branchId, warehouseId, departmentId, notes: formattedNotes, lines },
      userId,
    );
    return { data: mapPRDetail(pr) };
  }

  @Get()
  @AllRoles()
  async findAll(
    @Query()
    query: {
      status?: string;
      search?: string;
      page?: string;
      limit?: string;
      unconverted?: string;
    },
    @ActiveScope('warehouseId') warehouseId?: string,
  ) {
    const result = await this.prService.findAll(
      {
        status: query.status,
        search: query.search,
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 20,
        unconverted: query.unconverted === 'true',
      },
      warehouseId,
    );

    return {
      data: result.data.map(mapPRSummary),
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
    const pr = await this.prService.findOne(id);
    await this.scopeValidationService.validateWarehouse(
      userId,
      role,
      pr.warehouseId,
    );
    return { data: mapPRDetail(pr) };
  }

  @Put(':id')
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.PROC_OFFICER,
    Role.PROC_MGR,
    Role.BRANCH_MGR,
  )
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body() body: UpdatePurchaseRequestDto,
  ) {
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      select: { warehouseId: true, notes: true },
    });
    if (pr) {
      await this.scopeValidationService.validateWarehouse(
        userId,
        role,
        pr.warehouseId,
      );
    }
    const lines = body.lines ? body.lines.map((line) => ({
      itemId: line.itemId,
      quantity: Number(line.quantity),
      uomId: line.uomId,
    })) : undefined;

    const formattedNotes = formatPRNotesWithExpectedDate(body.notes, body.expectedDate, pr?.notes) || undefined;

    const updated = await this.prService.update(id, {
      version: body.version,
      branchId: body.branchId,
      warehouseId: body.warehouseId,
      departmentId: body.departmentId,
      notes: formattedNotes,
      lines,
    });
    return { data: mapPRDetail(updated) };
  }

  @Delete(':id')
  @Roles(
    Role.ADMIN,
    Role.INV_MGR,
    Role.PROC_OFFICER,
    Role.PROC_MGR,
    Role.BRANCH_MGR,
  )
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query('version') version?: string,
  ) {
    const pr = await this.prisma.purchaseRequest.findUnique({
      where: { id },
      select: { warehouseId: true },
    });
    if (pr) {
      await this.scopeValidationService.validateWarehouse(
        userId,
        role,
        pr.warehouseId,
      );
    }
    await this.prService.remove(id, version ? Number(version) : undefined);
    return { success: true };
  }

  @Post(':id/submit')
  @Roles(
    Role.ADMIN,
    Role.PROC_OFFICER,
    Role.INV_MGR,
    Role.BRANCH_MGR,
    Role.PROC_MGR,
  )
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
    @CurrentUser('role') role: string,
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
  @Roles(Role.ADMIN, Role.GM, Role.BRANCH_MGR, Role.PROC_MGR, Role.APPROVER)
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
    @CurrentUser('role') role: string,
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
  @Roles(Role.ADMIN, Role.GM, Role.BRANCH_MGR, Role.PROC_MGR, Role.APPROVER)
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
    @CurrentUser('role') role: string,
    @Body() body: { comments?: string; reason?: string; version?: number },
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;
    const comments = body.comments || body.reason || undefined;
    const pr = await this.prService.reject(id, userId, role as Role, {
      comments,
      version: body.version,
      ipAddress,
    });
    return { data: mapPRDetail(pr) };
  }

  @Post(':id/cancel')
  @Roles(
    Role.ADMIN,
    Role.PROC_OFFICER,
    Role.INV_MGR,
    Role.BRANCH_MGR,
    Role.PROC_MGR,
  )
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
    @CurrentUser('role') role: string,
    @Body() body: { comments?: string; reason?: string; version?: number },
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;
    const comments = body.comments || body.reason || undefined;
    const pr = await this.prService.cancel(id, userId, role as Role, {
      comments,
      version: body.version,
      ipAddress,
    });
    return { data: mapPRDetail(pr) };
  }



  @Post(':id/convert-to-po')
  @Roles(Role.ADMIN, Role.PROC_OFFICER, Role.PROC_MGR, Role.BRANCH_MGR)
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
    @CurrentUser('role') role: string,
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
