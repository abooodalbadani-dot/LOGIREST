import {
  Controller,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
  Req,
  Body,
} from '@nestjs/common';
import { GrnVoidService } from './grn-void.service';
import { IssueVoidService } from './issue-void.service';
import { AdjustmentVoidService } from './adjustment-void.service';
import { TransferVoidService } from './transfer-void.service';
import { KitchenRequestVoidService } from './kitchen-request-void.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import type { Request } from 'express';

const VALID_DOC_TYPES = [
  'grn',
  'issue',
  'adjustment',
  'transfer',
  'kitchen-request',
] as const;

@Controller('operations')
export class OperationsController {
  constructor(
    private readonly grnVoidService: GrnVoidService,
    private readonly issueVoidService: IssueVoidService,
    private readonly adjustmentVoidService: AdjustmentVoidService,
    private readonly transferVoidService: TransferVoidService,
    private readonly kitchenRequestVoidService: KitchenRequestVoidService,
  ) {}

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
