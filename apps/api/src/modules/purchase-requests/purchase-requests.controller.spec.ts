import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseRequestsController } from './purchase-requests.controller';
import { PurchaseRequestsService } from './purchase-requests.service';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import { ScopeValidationService } from '../../auth/scope-validation.service';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';

describe('PurchaseRequestsController', () => {
  const mockScopeValidationService = {
    validateWarehouse: jest.fn(),
    validateAtLeastOneWarehouse: jest.fn(),
  };

  let controller: PurchaseRequestsController;

  const mockPrService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    submit: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    cancel: jest.fn(),
    convertToPo: jest.fn(),
  };

  const mockPrismaService = {
    purchaseRequest: {
      findUnique: jest.fn(),
    },
  };
  const mockWorkflowService = {};

  const mockRequest = {
    headers: {},
    ip: '127.0.0.1',
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchaseRequestsController],
      providers: [
        { provide: PurchaseRequestsService, useValue: mockPrService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WorkflowService, useValue: mockWorkflowService },
        {
          provide: ScopeValidationService,
          useValue: mockScopeValidationService,
        },
      ],
    }).compile();

    controller = module.get<PurchaseRequestsController>(
      PurchaseRequestsController,
    );
    jest.clearAllMocks();
  });

  describe('update', () => {
    it('should throw ForbiddenException for cross-warehouse update', async () => {
      mockPrismaService.purchaseRequest.findUnique.mockResolvedValue({
        warehouseId: 'wh-1',
      });
      mockScopeValidationService.validateWarehouse.mockRejectedValue(
        new ForbiddenException('Access to this warehouse is not authorized.'),
      );

      await expect(
        controller.update('pr-1', 'user-1', Role.PROC_OFFICER, {
          version: 1,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should succeed for same-warehouse update', async () => {
      const mockPr = {
        id: 'pr-1',
        requestNumber: 'PR-001',
        status: 'DRAFT',
        version: 2,
        warehouseId: 'wh-1',
        lines: [],
        createdAt: new Date(),
      };
      mockPrismaService.purchaseRequest.findUnique.mockResolvedValue({
        warehouseId: 'wh-1',
      });
      mockPrService.update.mockResolvedValue(mockPr);

      const result = await controller.update(
        'pr-1',
        'user-1',
        Role.PROC_OFFICER,
        {
          version: 1,
          lines: [{ itemId: 'item-1', quantity: 5 }],
        },
      );

      expect(result.data).toBeDefined();
      expect(mockPrService.update).toHaveBeenCalledWith('pr-1', {
        version: 1,
        lines: [{ itemId: 'item-1', quantity: 5 }],
      });
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException for cross-warehouse delete', async () => {
      mockPrismaService.purchaseRequest.findUnique.mockResolvedValue({
        warehouseId: 'wh-1',
      });
      mockScopeValidationService.validateWarehouse.mockRejectedValue(
        new ForbiddenException('Access to this warehouse is not authorized.'),
      );

      await expect(
        controller.remove('pr-1', 'user-1', Role.PROC_OFFICER, '1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should succeed for same-warehouse delete', async () => {
      mockPrismaService.purchaseRequest.findUnique.mockResolvedValue({
        warehouseId: 'wh-1',
      });
      mockPrService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(
        'pr-1',
        'user-1',
        Role.PROC_OFFICER,
        '1',
      );

      expect(result).toEqual({ success: true });
      expect(mockPrService.remove).toHaveBeenCalledWith('pr-1', 1);
    });
  });
});
