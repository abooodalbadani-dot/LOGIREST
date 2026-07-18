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

  describe('create', () => {
    it('should forward lotAllocations to issuesService.create', async () => {
      mockScopeValidationService.validateWarehouse.mockResolvedValue(undefined);
      mockIssuesService.create.mockResolvedValue({
        id: 'issue-1',
        issueNumber: 'ISS-001',
        warehouseId: 'wh-1',
        departmentId: 'dept-1',
        status: 'DRAFT',
        lines: [
          {
            id: 'line-1',
            issueId: 'issue-1',
            itemId: 'item-1',
            quantity: 10,
            lotAllocations: [
              {
                lotId: 'lot-1',
                lot: { lotNumber: 'LOT-100', expiryDate: new Date() },
                quantityAllocated: 10,
              },
            ],
          },
        ],
        createdAt: new Date(),
      });

      const body = {
        warehouseId: 'wh-1',
        destinationDeptId: 'dept-1',
        lines: [
          {
            itemId: 'item-1',
            requestedQty: 10,
            lotAllocations: [
              {
                lotId: 'lot-1',
                lotNumber: 'LOT-100',
                allocatedQty: 10,
              },
            ],
          },
        ],
      };

      const result = await controller.create(
        body,
        'user-1',
        Role.WH_KEEPER,
        'wh-1',
      );

      expect(result).toBeDefined();
      expect(mockIssuesService.create).toHaveBeenCalledWith(
        {
          departmentId: 'dept-1',
          lines: [
            {
              itemId: 'item-1',
              quantity: 10,
              lotAllocations: [
                {
                  lotId: 'lot-1',
                  lotNumber: 'LOT-100',
                  quantityAllocated: 10,
                },
              ],
            },
          ],
          kitchenRequestId: undefined,
          notes: undefined,
        },
        'user-1',
        'wh-1',
      );
    });
  });
});
