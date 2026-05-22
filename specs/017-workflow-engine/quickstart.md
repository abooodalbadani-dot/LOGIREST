# Quickstart: Workflow Engine Integration Guide

This document describes how to set up, run, and integrate the Phase 4 Workflow Engine in the LogiRest API codebase.

## 1. Setup & Database Migrations

First, apply the Prisma schema changes and update the generated Prisma Client.

```bash
# Generate the migration and update the database schema
npx prisma migrate dev --schema=apps/api/prisma/schema.prisma --name add_approval_event_fields

# Generate the prisma client
npm run prisma:generate --workspace=api
```

## 2. Using the Workflow Decorator and Guard

To protect a status-changing route in a controller, decorate it with `@WorkflowAction` and apply the `WorkflowStateGuard`.

### Example Controller Usage

```typescript
import { Controller, Post, Param, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkflowStateGuard } from '../guards/workflow-state.guard';
import { WorkflowAction } from '../decorators/workflow-action.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('purchase-requests')
@UseGuards(JwtAuthGuard, WorkflowStateGuard)
export class PurchaseRequestController {
  
  @Post(':id/approve')
  @WorkflowAction({
    docType: 'PR',
    action: 'APPROVE',
    modelName: 'purchaseRequest',
    idParam: 'id'
  })
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('comments') comments?: string
  ) {
    // The WorkflowStateGuard has already loaded the document,
    // validated the role capability, transition rule, and warehouse locks.
    // It stores the target status in the request context.
    return this.prService.approve(id, user.id, comments);
  }
}
```

## 3. Workflow Service API

The `WorkflowService` can be injected and used directly for custom transition checks.

```typescript
import { Injectable } from '@nestjs/common';
import { WorkflowService } from './workflow.service';

@Injectable()
export class PurchaseRequestService {
  constructor(private readonly workflowService: WorkflowService) {}

  async approve(id: string, userId: string, comments?: string) {
    // Perform transition and write to database within a Prisma transaction
  }
}
```

## 4. Running Tests

Validate your implementation using Jest.

```bash
# Run unit tests for WorkflowService and WorkflowStateGuard
npm run test --filter=api -- src/modules/workflow

# Run NestJS API E2E tests
npm run test:e2e --filter=api
```
