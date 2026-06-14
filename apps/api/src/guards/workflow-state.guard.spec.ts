import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowStateGuard } from './workflow-state.guard';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../database/prisma.service';
import { WorkflowService } from '../modules/workflow/workflow.service';
import { ScopeValidationService } from '../auth/scope-validation.service';
import {
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

describe('WorkflowStateGuard', () => {
  let guard: WorkflowStateGuard;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockPrisma = {
    purchaseRequest: {
      findUnique: jest.fn(),
    },
  };

  const mockWorkflowService = {
    verifyRolePermission: jest.fn(),
    getNextStatus: jest.fn(),
    verifyWarehouseLocks: jest.fn(),
    writeAuditLog: jest.fn(),
  };

  const mockContext = (params: Record<string, string>, role: string) => {
    return {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-1', role },
          params,
          headers: {},
          ip: '127.0.0.1',
        }),
      }),
    } as unknown as ExecutionContext;
  };

  const mockScopeValidationService = {
    validateWarehouse: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowStateGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WorkflowService, useValue: mockWorkflowService },
        {
          provide: ScopeValidationService,
          useValue: mockScopeValidationService,
        },
      ],
    }).compile();

    guard = module.get<WorkflowStateGuard>(WorkflowStateGuard);

    mockScopeValidationService.validateWarehouse.mockReset();
    mockScopeValidationService.validateWarehouse.mockResolvedValue(undefined);
    jest.clearAllMocks();
  });

  it('should return true if no metadata is set', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(null);
    const result = await guard.canActivate(
      mockContext({ id: 'doc-1' }, 'PROC_OFFICER'),
    );
    expect(result).toBe(true);
  });

  it('should throw NotFoundException if document does not exist', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({
      docType: 'pr',
      action: 'SUBMIT',
      modelName: 'purchaseRequest',
    });
    mockPrisma.purchaseRequest.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(mockContext({ id: 'doc-1' }, 'PROC_OFFICER')),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException if user role lacks permission', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({
      docType: 'pr',
      action: 'APPROVE',
      modelName: 'purchaseRequest',
    });
    mockPrisma.purchaseRequest.findUnique.mockResolvedValue({
      id: 'doc-1',
      status: 'SUBMITTED',
      version: 1,
    });
    mockWorkflowService.verifyRolePermission.mockReturnValue(false);

    await expect(
      guard.canActivate(mockContext({ id: 'doc-1' }, 'WH_KEEPER')),
    ).rejects.toThrow(ForbiddenException);
    expect(mockWorkflowService.writeAuditLog).toHaveBeenCalled();
  });

  it('should throw BadRequestException if transition is invalid', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({
      docType: 'pr',
      action: 'SUBMIT',
      modelName: 'purchaseRequest',
    });
    mockPrisma.purchaseRequest.findUnique.mockResolvedValue({
      id: 'doc-1',
      status: 'APPROVED',
      version: 1,
    });
    mockWorkflowService.verifyRolePermission.mockReturnValue(true);
    mockWorkflowService.getNextStatus.mockReturnValue(null);

    await expect(
      guard.canActivate(mockContext({ id: 'doc-1' }, 'PROC_OFFICER')),
    ).rejects.toThrow(BadRequestException);
    expect(mockWorkflowService.writeAuditLog).toHaveBeenCalled();
  });

  it('should succeed and set workflowContext on request if all checks pass', async () => {
    mockReflector.getAllAndOverride.mockReturnValue({
      docType: 'pr',
      action: 'SUBMIT',
      modelName: 'purchaseRequest',
    });
    const doc = {
      id: 'doc-1',
      status: 'DRAFT',
      version: 1,
    };
    mockPrisma.purchaseRequest.findUnique.mockResolvedValue(doc);
    mockWorkflowService.verifyRolePermission.mockReturnValue(true);
    mockWorkflowService.getNextStatus.mockReturnValue('SUBMITTED');

    const req: Record<string, unknown> = {
      user: { id: 'user-1', role: 'PROC_OFFICER' },
      params: { id: 'doc-1' },
      headers: {},
    };

    const ctx = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    const reqCtx = req as unknown as {
      workflowContext: {
        docType: string;
        targetStatus: string;
        document: {
          status: string;
        };
      };
    };
    expect(reqCtx.workflowContext.docType).toBe('pr');
    expect(reqCtx.workflowContext.document.status).toBe('DRAFT');
    expect(reqCtx.workflowContext.targetStatus).toBe('SUBMITTED');
  });
});
