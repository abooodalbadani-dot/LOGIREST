/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Body,
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
    return this.issuesService.create(body, userId, warehouseId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.issuesService.findOne(id);
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

    return this.issuesService.submit(id, userId, role, {
      ...body,
      ipAddress,
    });
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

    return this.issuesService.cancel(id, userId, role, {
      ...body,
      ipAddress,
    });
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

    return this.issuePostService.post(
      id,
      userId,
      role,
      body.version,
      ipAddress,
    );
  }
}
