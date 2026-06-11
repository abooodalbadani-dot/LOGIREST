import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
  UseGuards,
  Req,
  Body,
} from '@nestjs/common';
import { GrnVoidService } from './grn-void.service';
import { IssueVoidService } from './issue-void.service';
import { AdjustmentVoidService } from './adjustment-void.service';
import { TransferVoidService } from './transfer-void.service';
import { KitchenRequestVoidService } from './kitchen-request-void.service';
import { LotsAvailableService } from './lots-available.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ActiveScope } from '../../auth/decorators/active-scope.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiSecureController } from '../../decorators/swagger-docs.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ScopeValidationService } from '../../auth/scope-validation.service';
import type { Request } from 'express';

const VALID_DOC_TYPES = [
  'grn',
  'issue',
  'adjustment',
  'transfer',
  'kitchen-request',
] as const;

@Controller('operations')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class OperationsController {
  constructor(
    private readonly grnVoidService: GrnVoidService,
    private readonly issueVoidService: IssueVoidService,
    private readonly adjustmentVoidService: AdjustmentVoidService,
    private readonly transferVoidService: TransferVoidService,
    private readonly kitchenRequestVoidService: KitchenRequestVoidService,
    private readonly lotsAvailableService: LotsAvailableService,
    private readonly prisma: PrismaService,
    private readonly scopeValidationService: ScopeValidationService,
  ) {}

  @Get('lots-available')
  async getLotsAvailable(
    @Query('itemId') itemId: string,
    @Query('warehouseId') warehouseId: string,
    @ActiveScope('warehouseId') activeWarehouseId: string,
  ) {
    if (warehouseId !== activeWarehouseId) {
      throw new ForbiddenException('WAREHOUSE_SCOPE_VIOLATION');
    }
    return this.lotsAvailableService.getLotsAvailable(
      itemId,
      activeWarehouseId,
    );
  }

  @Post(':documentType/:id/void')
  @HttpCode(HttpStatus.OK)
  async voidDocument(
    @Param('documentType') documentType: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body() body: { version?: number },
    @Req() req: Request,
  ) {
    if (role !== Role.ADMIN && role !== Role.INV_MGR) {
      throw new ForbiddenException(
        'Only administrators and inventory managers can void documents',
      );
    }

    if (
      !VALID_DOC_TYPES.includes(
        documentType as (typeof VALID_DOC_TYPES)[number],
      )
    ) {
      throw new BadRequestException(
        `Invalid document type: ${documentType}. Must be one of: ${VALID_DOC_TYPES.join(', ')}`,
      );
    }

    // Resolve warehouse and validate user scope (BOLA / IDOR defense)
    let warehouseId: string | null = null;
    let warehouseIds: string[] = [];

    switch (documentType) {
      case 'grn': {
        const doc = await this.prisma.goodsReceivedNote.findUnique({
          where: { id },
          select: { warehouseId: true },
        });
        if (doc) warehouseId = doc.warehouseId;
        break;
      }
      case 'issue': {
        const doc = await this.prisma.inventoryIssue.findUnique({
          where: { id },
          select: { warehouseId: true },
        });
        if (doc) warehouseId = doc.warehouseId;
        break;
      }
      case 'adjustment': {
        const doc = await this.prisma.adjustment.findUnique({
          where: { id },
          select: { warehouseId: true },
        });
        if (doc) warehouseId = doc.warehouseId;
        break;
      }
      case 'transfer': {
        const doc = await this.prisma.transfer.findUnique({
          where: { id },
          select: { fromWarehouseId: true, toWarehouseId: true },
        });
        if (doc) {
          warehouseIds = [doc.fromWarehouseId, doc.toWarehouseId];
        }
        break;
      }
      case 'kitchen-request': {
        const doc = await this.prisma.kitchenRequest.findUnique({
          where: { id },
          select: { warehouseId: true },
        });
        if (doc) warehouseId = doc.warehouseId;
        break;
      }
    }

    if (warehouseId) {
      await this.scopeValidationService.validateWarehouse(
        userId,
        role,
        warehouseId,
      );
    } else if (warehouseIds.length > 0) {
      await this.scopeValidationService.validateAtLeastOneWarehouse(
        userId,
        role,
        warehouseIds,
      );
    }

    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    switch (documentType) {
      case 'grn':
        return this.grnVoidService.void(
          id,
          userId,
          role,
          body.version,
          ipAddress,
        );
      case 'issue':
        return this.issueVoidService.void(
          id,
          userId,
          role,
          body.version,
          ipAddress,
        );
      case 'adjustment':
        return this.adjustmentVoidService.void(
          id,
          userId,
          role,
          body.version,
          ipAddress,
        );
      case 'transfer':
        return this.transferVoidService.void(
          id,
          userId,
          role,
          body.version,
          ipAddress,
        );
      case 'kitchen-request':
        return this.kitchenRequestVoidService.void(
          id,
          userId,
          role,
          body.version,
          ipAddress,
        );
    }
  }
}
