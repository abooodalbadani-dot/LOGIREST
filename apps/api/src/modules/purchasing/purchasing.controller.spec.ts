import { Test, TestingModule } from '@nestjs/testing';
import { GrnController } from './grn/grn.controller';
import { GrnPostService } from './grn-post.service';
import { GrnVoidService } from '../operations/grn-void.service';
import { GrnService } from './grn/grn.service';
import { PurchaseOrderController } from './purchase-orders/po.controller';
import { PurchaseOrderService } from './purchase-orders/po.service';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { ScopeValidationService } from '../../auth/scope-validation.service';

describe('Purchasing Controllers', () => {
  const mockScopeValidationService = {
    validateWarehouse: jest.fn(),
    validateAtLeastOneWarehouse: jest.fn(),
  };
  const mockGrnPostService = {
    post: jest.fn(),
  };
  const mockGrnVoidService = {
    void: jest.fn(),
  };

  const mockGrnService = {};

  const mockPurchaseOrderService = {
    create: jest.fn(),
    findOne: jest.fn(),
    submit: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    cancel: jest.fn(),
  };

  const mockPrismaService = {};
  const mockWorkflowService = {};

  const mockRequest = {
    headers: {},
    ip: '127.0.0.1',
  } as unknown as Request;

  describe('GrnController', () => {
    let controller: GrnController;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [GrnController],
        providers: [
          { provide: GrnService, useValue: mockGrnService },
          { provide: GrnPostService, useValue: mockGrnPostService },
          { provide: GrnVoidService, useValue: mockGrnVoidService },
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: WorkflowService, useValue: mockWorkflowService },
          {
            provide: ScopeValidationService,
            useValue: mockScopeValidationService,
          },
        ],
      }).compile();

      controller = module.get<GrnController>(GrnController);
      jest.clearAllMocks();
    });

    it('should call GrnPostService.post', async () => {
      const mockGrn = {
        id: 'grn-1',
        grnNumber: 'GRN-001',
        status: 'POSTED',
        createdAt: new Date(),
        purchaseOrder: {
          supplierId: 'sup-1',
          supplier: { id: 'sup-1', name: 'Supplier 1' },
          currencyId: 'cur-1',
          poNumber: 'PO-001',
        },
        warehouseId: 'wh-1',
        version: 1,
        lines: [],
      };
      mockGrnPostService.post.mockResolvedValue(mockGrn);

      const result = await controller.post(
        'grn-1',
        'user-1',
        'WH_KEEPER',
        { version: 1 },
        mockRequest,
      );
      expect(result.data.id).toEqual('grn-1');
      expect(result.data.status).toEqual('POSTED');
      expect(mockGrnPostService.post).toHaveBeenCalledWith(
        'grn-1',
        'user-1',
        'WH_KEEPER',
        1,
        '127.0.0.1',
      );
    });
  });

  describe('PurchaseOrderController', () => {
    let controller: PurchaseOrderController;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [PurchaseOrderController],
        providers: [
          { provide: PurchaseOrderService, useValue: mockPurchaseOrderService },
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: WorkflowService, useValue: mockWorkflowService },
          {
            provide: ScopeValidationService,
            useValue: mockScopeValidationService,
          },
        ],
      }).compile();

      controller = module.get<PurchaseOrderController>(PurchaseOrderController);
      jest.clearAllMocks();
    });

    it('should call create', async () => {
      const body = { supplierId: 'sup-1', currencyId: 'cur-1', lines: [] };
      mockPurchaseOrderService.create.mockResolvedValue({ id: 'po-1' });

      const result = await controller.create(body, 'user-1', Role.ADMIN);
      expect(result.data.id).toEqual('po-1');
      expect(mockPurchaseOrderService.create).toHaveBeenCalledWith(
        body,
        'user-1',
      );
    });

    it('should call findOne', async () => {
      mockPurchaseOrderService.findOne.mockResolvedValue({
        id: 'po-1',
        purchaseRequest: { warehouseId: 'wh-1' },
      });

      const result = await controller.findOne('po-1', 'user-1', Role.ADMIN);
      expect(result.data.id).toEqual('po-1');
      expect(mockPurchaseOrderService.findOne).toHaveBeenCalledWith('po-1');
    });

    it('should call submit', async () => {
      mockPurchaseOrderService.submit.mockResolvedValue({
        id: 'po-1',
        status: 'SUBMITTED',
      });

      const result = await controller.submit(
        'po-1',
        'user-1',
        'WH_KEEPER',
        { comments: 'ok', version: 1 },
        mockRequest,
      );
      expect(result.data.id).toEqual('po-1');
      expect(result.data.status).toEqual('SUBMITTED');
      expect(mockPurchaseOrderService.submit).toHaveBeenCalledWith(
        'po-1',
        'user-1',
        'WH_KEEPER',
        { comments: 'ok', version: 1, ipAddress: '127.0.0.1' },
      );
    });

    it('should call approve', async () => {
      mockPurchaseOrderService.approve.mockResolvedValue({
        id: 'po-1',
        status: 'APPROVED',
      });

      const result = await controller.approve(
        'po-1',
        'user-1',
        'INV_MGR',
        { comments: 'approved', version: 2 },
        mockRequest,
      );
      expect(result.data.id).toEqual('po-1');
      expect(result.data.status).toEqual('APPROVED');
    });

    it('should call reject', async () => {
      mockPurchaseOrderService.reject.mockResolvedValue({
        id: 'po-1',
        status: 'REJECTED',
      });

      const result = await controller.reject(
        'po-1',
        'user-1',
        'INV_MGR',
        { comments: 'price too high', version: 2 },
        mockRequest,
      );
      expect(result.data.id).toEqual('po-1');
      expect(result.data.status).toEqual('REJECTED');
    });

    it('should call cancel', async () => {
      mockPurchaseOrderService.cancel.mockResolvedValue({
        id: 'po-1',
        status: 'CANCELLED',
      });

      const result = await controller.cancel(
        'po-1',
        'user-1',
        'WH_KEEPER',
        { comments: 'cancelled', version: 2 },
        mockRequest,
      );
      expect(result.data.id).toEqual('po-1');
      expect(result.data.status).toEqual('CANCELLED');
    });
  });
});
