import { Test, TestingModule } from '@nestjs/testing';
import { IssuesController } from './issues/issues.controller';
import { IssuesService } from './issues/issues.service';
import { IssuePostService } from './issue-post.service';
import { TransfersController } from './transfers/transfers.controller';
import { TransfersService } from './transfers/transfers.service';
import { TransferPostService } from './transfer-post.service';
import { AdjustmentsController } from './adjustments/adjustments.controller';
import { AdjustmentsService } from './adjustments/adjustments.service';
import { AdjustmentPostService } from './adjustment-post.service';
import { KitchenRequestsController } from '../kitchen-requests/kitchen-requests.controller';
import { KitchenRequestsService } from '../kitchen-requests/kitchen-requests.service';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import { PdfGeneratorService } from '../pdf/pdf-generator.service';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { ScopeValidationService } from '../../auth/scope-validation.service';

describe('Operations and Kitchen Requests Controllers', () => {
  const mockScopeValidationService = {
    validateWarehouse: jest.fn(),
    validateAtLeastOneWarehouse: jest.fn(),
  };

  const mockIssuesService = {
    create: jest.fn(),
    findOne: jest.fn(),
    submit: jest.fn(),
    cancel: jest.fn(),
  };

  const mockIssuePostService = {
    post: jest.fn(),
  };

  const mockTransfersService = {
    create: jest.fn(),
    findOne: jest.fn(),
    cancel: jest.fn(),
  };

  const mockTransferPostService = {
    ship: jest.fn(),
    receive: jest.fn(),
  };

  const mockAdjustmentsService = {
    create: jest.fn(),
    findOne: jest.fn(),
    submit: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    cancel: jest.fn(),
  };

  const mockAdjustmentPostService = {
    post: jest.fn(),
  };

  const mockKitchenRequestsService = {
    create: jest.fn(),
    findOne: jest.fn(),
    submit: jest.fn(),
    fulfill: jest.fn(),
    cancel: jest.fn(),
  };

  const mockPdfGeneratorService = {};
  const mockPrismaService = {};
  const mockWorkflowService = {};

  const mockRequest = {
    headers: {},
    ip: '127.0.0.1',
  } as unknown as Request;

  describe('IssuesController', () => {
    let controller: IssuesController;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [IssuesController],
        providers: [
          { provide: IssuesService, useValue: mockIssuesService },
          { provide: IssuePostService, useValue: mockIssuePostService },
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

    it('should call create', async () => {
      const body = {
        destinationDeptId: 'dept-1',
        lines: [{ itemId: 'item-1', requestedQty: 5 }],
        kitchenRequestId: 'req-1',
        notes: 'test notes',
      };
      mockIssuesService.create.mockResolvedValue({ id: 'iss-1' });

      const result = await controller.create(
        body,
        'user-1',
        Role.ADMIN,
        'wh-1',
      );
      expect(result.id).toBe('iss-1');
      expect(mockIssuesService.create).toHaveBeenCalledWith(
        {
          departmentId: 'dept-1',
          lines: [{ itemId: 'item-1', quantity: 5, lotAllocations: [] }],
          kitchenRequestId: 'req-1',
          notes: 'test notes',
        },
        'user-1',
        'wh-1',
      );
    });

    it('should call findOne', async () => {
      mockIssuesService.findOne.mockResolvedValue({
        id: 'iss-1',
        warehouseId: 'wh-1',
      });

      const result = await controller.findOne('iss-1', 'user-1', Role.ADMIN);
      expect(result.id).toBe('iss-1');
    });

    it('should call submit', async () => {
      mockIssuesService.submit.mockResolvedValue({
        id: 'iss-1',
        status: 'SUBMITTED',
      });

      const result = await controller.submit(
        'iss-1',
        'user-1',
        'WH_KEEPER',
        { comments: 'done', version: 1 },
        mockRequest,
      );
      expect(result.id).toBe('iss-1');
      expect(result.status).toBe('SUBMITTED');
    });

    it('should call cancel', async () => {
      mockIssuesService.cancel.mockResolvedValue({
        id: 'iss-1',
        status: 'CANCELLED',
      });

      const result = await controller.cancel(
        'iss-1',
        'user-1',
        'WH_KEEPER',
        { comments: 'abort', version: 1 },
        mockRequest,
      );
      expect(result.id).toBe('iss-1');
      expect(result.status).toBe('CANCELLED');
    });

    it('should call post', async () => {
      mockIssuePostService.post.mockResolvedValue({
        id: 'iss-1',
        status: 'POSTED',
      });

      const result = await controller.post(
        'iss-1',
        'user-1',
        'INV_MGR',
        { version: 2 },
        mockRequest,
      );
      expect(result.id).toBe('iss-1');
      expect(result.status).toBe('POSTED');
    });
  });

  describe('TransfersController', () => {
    let controller: TransfersController;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [TransfersController],
        providers: [
          { provide: TransfersService, useValue: mockTransfersService },
          { provide: TransferPostService, useValue: mockTransferPostService },
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: WorkflowService, useValue: mockWorkflowService },
          { provide: PdfGeneratorService, useValue: mockPdfGeneratorService },
          {
            provide: ScopeValidationService,
            useValue: mockScopeValidationService,
          },
        ],
      }).compile();

      controller = module.get<TransfersController>(TransfersController);
      jest.clearAllMocks();
    });

    it('should call create', async () => {
      const body = {
        fromWarehouseId: 'wh-1',
        toWarehouseId: 'wh-2',
        lines: [],
      };
      mockTransfersService.create.mockResolvedValue({ id: 'tr-1' });

      const result = await controller.create(body, 'user-1', Role.ADMIN);
      expect(result.id).toBe('tr-1');
    });

    it('should call findOne', async () => {
      mockTransfersService.findOne.mockResolvedValue({
        id: 'tr-1',
        fromWarehouseId: 'wh-1',
        toWarehouseId: 'wh-2',
      });

      const result = await controller.findOne('tr-1', 'user-1', Role.ADMIN);
      expect(result.id).toBe('tr-1');
    });

    it('should call ship', async () => {
      mockTransfersService.findOne.mockResolvedValue({
        id: 'tr-1',
        status: 'IN_TRANSIT',
        fromWarehouseId: 'wh-1',
        toWarehouseId: 'wh-2',
      });
      mockTransferPostService.ship.mockResolvedValue({
        id: 'tr-1',
        status: 'IN_TRANSIT',
      });

      const result = await controller.ship(
        'tr-1',
        'user-1',
        'WH_KEEPER',
        { version: 1 },
        mockRequest,
      );
      expect(result.id).toBe('tr-1');
      expect(result.status).toBe('IN_TRANSIT');
    });

    it('should call receive', async () => {
      mockTransfersService.findOne.mockResolvedValue({
        id: 'tr-1',
        status: 'RECEIVED',
        fromWarehouseId: 'wh-1',
        toWarehouseId: 'wh-2',
      });
      mockTransferPostService.receive.mockResolvedValue({
        id: 'tr-1',
        status: 'RECEIVED',
      });

      const result = await controller.receive(
        'tr-1',
        'user-1',
        'WH_KEEPER',
        { version: 2, linesReceived: [] },
        mockRequest,
      );
      expect(result.id).toBe('tr-1');
      expect(result.status).toBe('RECEIVED');
    });

    it('should call cancel', async () => {
      mockTransfersService.cancel.mockResolvedValue({
        id: 'tr-1',
        status: 'CANCELLED',
      });

      const result = await controller.cancel(
        'tr-1',
        'user-1',
        'WH_KEEPER',
        { comments: 'no', version: 1 },
        mockRequest,
      );
      expect(result.id).toBe('tr-1');
      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('AdjustmentsController', () => {
    let controller: AdjustmentsController;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [AdjustmentsController],
        providers: [
          { provide: AdjustmentsService, useValue: mockAdjustmentsService },
          {
            provide: AdjustmentPostService,
            useValue: mockAdjustmentPostService,
          },
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: WorkflowService, useValue: mockWorkflowService },
          { provide: PdfGeneratorService, useValue: mockPdfGeneratorService },
          {
            provide: ScopeValidationService,
            useValue: mockScopeValidationService,
          },
        ],
      }).compile();

      controller = module.get<AdjustmentsController>(AdjustmentsController);
      jest.clearAllMocks();
    });

    it('should call create', async () => {
      const body = { warehouseId: 'wh-1', lines: [] };
      mockAdjustmentsService.create.mockResolvedValue({ id: 'adj-1' });

      const result = await controller.create(body, 'user-1', Role.ADMIN);
      expect(result.id).toBe('adj-1');
    });

    it('should call findOne', async () => {
      mockAdjustmentsService.findOne.mockResolvedValue({
        id: 'adj-1',
        warehouseId: 'wh-1',
      });

      const result = await controller.findOne('adj-1', 'user-1', Role.ADMIN);
      expect(result.id).toBe('adj-1');
    });

    it('should call submit', async () => {
      mockAdjustmentsService.submit.mockResolvedValue({
        id: 'adj-1',
        status: 'SUBMITTED',
      });

      const result = await controller.submit(
        'adj-1',
        'user-1',
        'WH_KEEPER',
        { version: 1 },
        mockRequest,
      );
      expect(result.id).toBe('adj-1');
      expect(result.status).toBe('SUBMITTED');
    });

    it('should call approve', async () => {
      mockAdjustmentsService.approve.mockResolvedValue({
        id: 'adj-1',
        status: 'APPROVED',
      });

      const result = await controller.approve(
        'adj-1',
        'user-1',
        'INV_MGR',
        { version: 2 },
        mockRequest,
      );
      expect(result.id).toBe('adj-1');
      expect(result.status).toBe('APPROVED');
    });

    it('should call reject', async () => {
      mockAdjustmentsService.reject.mockResolvedValue({
        id: 'adj-1',
        status: 'REJECTED',
      });

      const result = await controller.reject(
        'adj-1',
        'user-1',
        'INV_MGR',
        { version: 2 },
        mockRequest,
      );
      expect(result.id).toBe('adj-1');
      expect(result.status).toBe('REJECTED');
    });

    it('should call cancel', async () => {
      mockAdjustmentsService.cancel.mockResolvedValue({
        id: 'adj-1',
        status: 'CANCELLED',
      });

      const result = await controller.cancel(
        'adj-1',
        'user-1',
        'WH_KEEPER',
        { version: 1 },
        mockRequest,
      );
      expect(result.id).toBe('adj-1');
      expect(result.status).toBe('CANCELLED');
    });

    it('should call post', async () => {
      mockAdjustmentPostService.post.mockResolvedValue({
        id: 'adj-1',
        status: 'POSTED',
      });

      const result = await controller.post(
        'adj-1',
        'user-1',
        'INV_MGR',
        { version: 3 },
        mockRequest,
      );
      expect(result.id).toBe('adj-1');
      expect(result.status).toBe('POSTED');
    });
  });

  describe('KitchenRequestsController', () => {
    let controller: KitchenRequestsController;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [KitchenRequestsController],
        providers: [
          {
            provide: KitchenRequestsService,
            useValue: mockKitchenRequestsService,
          },
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: WorkflowService, useValue: mockWorkflowService },
          {
            provide: ScopeValidationService,
            useValue: mockScopeValidationService,
          },
        ],
      }).compile();

      controller = module.get<KitchenRequestsController>(
        KitchenRequestsController,
      );
      jest.clearAllMocks();
    });

    it('should call create', async () => {
      const body = { departmentId: 'dept-1', warehouseId: 'wh-1', items: [] };
      mockKitchenRequestsService.create.mockResolvedValue({ id: 'kr-1' });

      const result = await controller.create(body, 'user-1', Role.ADMIN);
      expect(result.data.id).toBe('kr-1');
    });

    it('should call findOne', async () => {
      mockKitchenRequestsService.findOne.mockResolvedValue({
        id: 'kr-1',
        warehouseId: 'wh-1',
      });

      const result = await controller.findOne('kr-1', 'user-1', Role.ADMIN);
      expect(result.data.id).toBe('kr-1');
    });

    it('should call submit', async () => {
      mockKitchenRequestsService.submit.mockResolvedValue({
        id: 'kr-1',
        status: 'SUBMITTED',
      });

      const result = await controller.submit(
        'kr-1',
        'user-1',
        'KITCHEN_CHIEF',
        { version: 1 },
        mockRequest,
      );
      expect(result.data.id).toBe('kr-1');
      expect(result.data.status).toBe('SUBMITTED');
    });

    it('should call fulfill', async () => {
      mockKitchenRequestsService.fulfill.mockResolvedValue({
        id: 'kr-1',
        status: 'FULFILLED',
      });

      const result = await controller.fulfill(
        'kr-1',
        'user-1',
        'WH_KEEPER',
        { version: 2 },
        mockRequest,
      );
      expect(result.data.id).toBe('kr-1');
      expect(result.data.status).toBe('FULFILLED');
    });

    it('should call cancel', async () => {
      mockKitchenRequestsService.cancel.mockResolvedValue({
        id: 'kr-1',
        status: 'CANCELLED',
      });

      const result = await controller.cancel(
        'kr-1',
        'user-1',
        'KITCHEN_CHIEF',
        { version: 1 },
        mockRequest,
      );
      expect(result.data.id).toBe('kr-1');
      expect(result.data.status).toBe('CANCELLED');
    });
  });
});
