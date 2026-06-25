import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseOrderController } from './po.controller';
import { PurchaseOrderService } from './po.service';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { ScopeValidationService } from '../../../auth/scope-validation.service';
import { PdfGeneratorService } from '../../pdf/pdf-generator.service';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';

describe('PurchaseOrderController', () => {
  const mockScopeValidationService = {
    validateWarehouse: jest.fn(),
    validateAtLeastOneWarehouse: jest.fn(),
  };

  let controller: PurchaseOrderController;

  const mockPoService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    submit: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    cancel: jest.fn(),
    email: jest.fn(),
  };

  const mockPdfGeneratorService = {};
  const mockPrismaService = {};
  const mockWorkflowService = {};

  const mockRequest = {
    headers: {},
    ip: '127.0.0.1',
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchaseOrderController],
      providers: [
        { provide: PurchaseOrderService, useValue: mockPoService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WorkflowService, useValue: mockWorkflowService },
        { provide: PdfGeneratorService, useValue: mockPdfGeneratorService },
        {
          provide: ScopeValidationService,
          useValue: mockScopeValidationService,
        },
      ],
    }).compile();

    controller = module.get<PurchaseOrderController>(PurchaseOrderController);
    mockScopeValidationService.validateWarehouse.mockReset();
    mockScopeValidationService.validateWarehouse.mockResolvedValue(undefined);
    jest.clearAllMocks();
  });

  describe('update', () => {
    it('should throw ForbiddenException for cross-warehouse update', async () => {
      mockPoService.findOne.mockResolvedValue({
        id: 'po-1',
        purchaseRequest: { warehouseId: 'wh-1' },
      });
      mockScopeValidationService.validateWarehouse.mockRejectedValue(
        new ForbiddenException('Access to this warehouse is not authorized.'),
      );

      await expect(
        controller.update('po-1', 'user-1', Role.PROC_OFFICER, {
          version: 1,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should succeed for same-warehouse update', async () => {
      mockPoService.findOne.mockResolvedValue({
        id: 'po-1',
        purchaseRequest: { warehouseId: 'wh-1' },
      });
      mockPoService.update.mockResolvedValue({
        id: 'po-1',
        poNumber: 'PO-001',
        version: 2,
        purchaseRequest: { warehouseId: 'wh-1', warehouse: { name: 'WH-1' } },
      });

      const result = await controller.update(
        'po-1',
        'user-1',
        Role.PROC_OFFICER,
        {
          supplierId: 'supplier-1',
          version: 1,
        },
      );

      expect(result.data).toBeDefined();
      expect(mockPoService.update).toHaveBeenCalledWith('po-1', {
        supplierId: 'supplier-1',
        version: 1,
      });
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException for cross-warehouse delete', async () => {
      mockPoService.findOne.mockResolvedValue({
        id: 'po-1',
        purchaseRequest: { warehouseId: 'wh-1' },
      });
      mockScopeValidationService.validateWarehouse.mockRejectedValue(
        new ForbiddenException('Access to this warehouse is not authorized.'),
      );

      await expect(
        controller.remove('po-1', 'user-1', Role.PROC_OFFICER, '1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should succeed for same-warehouse delete', async () => {
      mockPoService.findOne.mockResolvedValue({
        id: 'po-1',
        purchaseRequest: { warehouseId: 'wh-1' },
      });
      mockPoService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(
        'po-1',
        'user-1',
        Role.PROC_OFFICER,
        '1',
      );

      expect(result).toEqual({ success: true });
      expect(mockPoService.remove).toHaveBeenCalledWith('po-1', 1);
    });
  });

  describe('workflow endpoints', () => {
    it('should call submit with valid scope', async () => {
      mockPoService.submit.mockResolvedValue({
        id: 'po-1',
        status: 'SUBMITTED',
      });

      const result = await controller.submit(
        'po-1',
        'user-1',
        Role.PROC_OFFICER,
        { comments: 'submitting', version: 1 },
        mockRequest,
      );

      expect(result.data.status).toBe('SUBMITTED');
    });

    it('should call approve with valid scope', async () => {
      mockPoService.approve.mockResolvedValue({
        id: 'po-1',
        status: 'APPROVED',
      });

      const result = await controller.approve(
        'po-1',
        'user-1',
        Role.INV_MGR,
        { version: 1 },
        mockRequest,
      );

      expect(result.data.status).toBe('APPROVED');
    });

    it('should call reject with valid scope', async () => {
      mockPoService.reject.mockResolvedValue({
        id: 'po-1',
        status: 'REJECTED',
      });

      const result = await controller.reject(
        'po-1',
        'user-1',
        Role.INV_MGR,
        { comments: 'not needed', version: 1 },
        mockRequest,
      );

      expect(result.data.status).toBe('REJECTED');
    });

    it('should call cancel with valid scope', async () => {
      mockPoService.cancel.mockResolvedValue({
        id: 'po-1',
        status: 'CANCELLED',
      });

      const result = await controller.cancel(
        'po-1',
        'user-1',
        Role.PROC_OFFICER,
        { version: 1 },
        mockRequest,
      );

      expect(result.data.status).toBe('CANCELLED');
    });
  });
});
