import { Test, TestingModule } from '@nestjs/testing';
import { IssuesController } from './issues.controller';
import { IssuePostService } from '../issue-post.service';
import { IssuesService } from './issues.service';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { ScopeValidationService } from '../../../auth/scope-validation.service';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';

describe('IssuesController', () => {
  const mockScopeValidationService = {
    validateWarehouse: jest.fn(),
    validateAtLeastOneWarehouse: jest.fn(),
  };

  let controller: IssuesController;

  const mockIssuePostService = {
    post: jest.fn(),
  };

  const mockPrismaService = {};
  const mockWorkflowService = {};

  const mockIssuesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    submit: jest.fn(),
    cancel: jest.fn(),
  };

  const mockRequest = {
    headers: {},
    ip: '127.0.0.1',
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IssuesController],
      providers: [
        { provide: IssuePostService, useValue: mockIssuePostService },
        { provide: IssuesService, useValue: mockIssuesService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WorkflowService, useValue: mockWorkflowService },
        {
          provide: ScopeValidationService,
          useValue: mockScopeValidationService,
        },
      ],
    }).compile();

    controller = module.get<IssuesController>(IssuesController);
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should succeed for valid warehouse scope', async () => {
      mockIssuesService.findOne.mockResolvedValue({
        id: 'issue-1',
        issueNumber: 'ISS-001',
        warehouseId: 'wh-1',
        status: 'DRAFT',
        lines: [],
        createdAt: new Date(),
      });
      mockScopeValidationService.validateWarehouse.mockResolvedValue(undefined);

      const result = await controller.findOne(
        'issue-1',
        'user-1',
        Role.WH_KEEPER,
      );

      expect(result).toBeDefined();
      expect(mockIssuesService.findOne).toHaveBeenCalledWith('issue-1');
    });

    it('should throw ForbiddenException for cross-warehouse access', async () => {
      mockIssuesService.findOne.mockResolvedValue({
        id: 'issue-1',
        warehouseId: 'wh-other',
      });
      mockScopeValidationService.validateWarehouse.mockRejectedValue(
        new ForbiddenException('Access to this warehouse is not authorized.'),
      );

      await expect(
        controller.findOne('issue-1', 'user-1', Role.WH_KEEPER),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
