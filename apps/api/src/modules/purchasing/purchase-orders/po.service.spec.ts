import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseOrderService } from './po.service';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { OutboxService } from '../../outbox/outbox.service';
import { DocumentNumberService } from '../../sequencing/document-number.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Role } from '@logirest/shared-types';

describe('PurchaseOrderService', () => {
  let service: PurchaseOrderService;
  let prisma: PrismaService;
  let workflowService: WorkflowService;

  const mockPrisma = {
    purchaseOrder: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    purchaseRequest: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    branch: {
      findFirst: jest.fn(),
    },
    approvalEvent: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    currency: {
      findUnique: jest.fn(),
    },
    goodsReceivedNote: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest
      .fn()
      .mockImplementation((cb: (tx: unknown) => Promise<unknown>) =>
        cb(mockPrisma),
      ),
  };

  const mockWorkflowService = {
    executeTransition: jest.fn(),
  };

  const mockOutboxService = {
    writeEvent: jest.fn(),
  };

  const mockDocumentNumberService = {
    next: jest.fn().mockImplementation((tx, type) => {
      return `${type}-SEQ-00001`;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WorkflowService, useValue: mockWorkflowService },
        { provide: OutboxService, useValue: mockOutboxService },
        {
          provide: DocumentNumberService,
          useValue: mockDocumentNumberService,
        },
      ],
    }).compile();

    service = module.get<PurchaseOrderService>(PurchaseOrderService);
    prisma = module.get<PrismaService>(PrismaService);
    workflowService = module.get<WorkflowService>(WorkflowService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a Purchase Order with lines in DRAFT status when isSubmitted is false', async () => {
      const body = {
        supplierId: 'supplier-1',
        currencyId: 'currency-1',
        prId: 'pr-1',
        isSubmitted: false,
        lines: [{ itemId: 'item-1', quantity: 10, unitPrice: 5.5 }],
      };

      mockPrisma.purchaseRequest.findUnique.mockResolvedValue({
        branchId: 'branch-1',
        status: 'APPROVED',
      });
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue(null);

      mockPrisma.purchaseOrder.create.mockResolvedValue({
        id: 'po-1',
        poNumber: 'PO-SEQ-00001',
        status: 'DRAFT',
        ...body,
      });

      const result = await service.create(body, 'user-1');
      expect(result).toHaveProperty('id');
      expect(mockPrisma.purchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DRAFT',
          }),
        }),
      );
      expect(mockOutboxService.writeEvent).not.toHaveBeenCalled();
    });

    it('should create a Purchase Order in PENDING_APPROVAL status and dispatch PO_SUBMITTED outbox event when isSubmitted is true', async () => {
      const body = {
        supplierId: 'supplier-1',
        currencyId: 'currency-1',
        prId: 'pr-1',
        isSubmitted: true,
        lines: [{ itemId: 'item-1', quantity: 10, unitPrice: 5.5 }],
      };

      mockPrisma.purchaseRequest.findUnique.mockResolvedValue({
        branchId: 'branch-1',
        status: 'APPROVED',
      });
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue(null);

      mockPrisma.purchaseOrder.create.mockResolvedValue({
        id: 'po-1',
        poNumber: 'PO-SEQ-00001',
        ...body,
        status: 'PENDING_APPROVAL',
      });

      const result = await service.create(body, 'user-1');
      expect(result).toHaveProperty('id');
      expect(mockPrisma.purchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING_APPROVAL',
          }),
        }),
      );
      expect(mockPrisma.approvalEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            documentId: 'po-1',
            toStatus: 'PENDING_APPROVAL',
            actionPerformed: 'SUBMIT',
          }),
        }),
      );
      expect(mockOutboxService.writeEvent).toHaveBeenCalledWith(
        mockPrisma,
        'PO_SUBMITTED',
        expect.objectContaining({
          id: 'po-1',
          documentNumber: 'PO-SEQ-00001',
          supplierId: 'supplier-1',
        }),
      );
    });

    it('should retry transaction and succeed when PrismaClientKnownRequestError P2034 lock error occurs on first attempt', async () => {
      const body = {
        supplierId: 'supplier-1',
        currencyId: 'currency-1',
        lines: [{ itemId: 'item-1', quantity: 10, unitPrice: 5.5 }],
      };

      const lockError = new (require('@prisma/client').Prisma.PrismaClientKnownRequestError)(
        'Transaction failed due to lock timeout',
        { code: 'P2034', clientVersion: '5.x' },
      );

      mockPrisma.branch.findFirst.mockResolvedValue({ id: 'branch-1' });
      mockPrisma.purchaseOrder.create.mockResolvedValue({
        id: 'po-retry-1',
        poNumber: 'PO-2026-HQ-00002',
        supplierId: 'supplier-1',
      });

      let attempts = 0;
      mockPrisma.$transaction.mockImplementationOnce(() => {
        attempts++;
        throw lockError;
      }).mockImplementationOnce((cb: (tx: unknown) => Promise<unknown>) => {
        attempts++;
        return cb(mockPrisma);
      });

      const result = await service.create(body, 'user-1', 'PROC_OFFICER' as Role);
      expect(attempts).toBe(2);
      expect(result).toHaveProperty('id', 'po-retry-1');
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if PO not found', async () => {
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue(null);

      await expect(service.findOne('po-1')).rejects.toThrow(
        new NotFoundException('Purchase Order with ID po-1 not found'),
      );
    });

    it('should return PO details if found', async () => {
      const po = { id: 'po-1', poNumber: 'PO-123' };
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue(po);

      const result = await service.findOne('po-1');
      expect(result).toEqual({ ...po, approvalEvents: [] });
    });
  });

  describe('workflow transitions', () => {
    const userId = 'user-1';
    const role = 'WH_KEEPER' as Role;
    const body = {
      comments: 'Transition comments',
      version: 1,
      ipAddress: '127.0.0.1',
    };

    it('should call executeTransition for submit', async () => {
      mockWorkflowService.executeTransition.mockResolvedValue({
        id: 'po-1',
        status: 'SUBMITTED',
      });
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: 'SUBMITTED',
      });

      const result = await service.submit('po-1', userId, role, body);
      expect(result).toEqual({ id: 'po-1', status: 'SUBMITTED', approvalEvents: [] });
      expect(mockWorkflowService.executeTransition).toHaveBeenCalledWith(
        'po-1',
        'purchaseOrder',
        'SUBMIT',
        userId,
        role,
        body.comments,
        body.version,
        body.ipAddress,
      );
    });

    it('should call executeTransition for approve', async () => {
      mockWorkflowService.executeTransition.mockResolvedValue({
        id: 'po-1',
        status: 'APPROVED',
      });
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: 'APPROVED',
      });

      const result = await service.approve('po-1', userId, role, body);
      expect(result).toEqual({ id: 'po-1', status: 'APPROVED', approvalEvents: [] });
    });

    it('should call executeTransition for reject', async () => {
      mockWorkflowService.executeTransition.mockResolvedValue({
        id: 'po-1',
        status: 'REJECTED',
      });
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: 'REJECTED',
      });

      const result = await service.reject('po-1', userId, role, body);
      expect(result).toEqual({ id: 'po-1', status: 'REJECTED', approvalEvents: [] });
    });

    it('should call executeTransition for cancel', async () => {
      mockWorkflowService.executeTransition.mockResolvedValue({
        id: 'po-1',
        status: 'CANCELLED',
      });
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: 'CANCELLED',
      });

      const result = await service.cancel('po-1', userId, role, body);
      expect(result).toEqual({ id: 'po-1', status: 'CANCELLED', approvalEvents: [] });
    });

    it('should throw BadRequestException if FX rate is not 1 for base currency', async () => {
      mockPrisma.currency.findUnique.mockResolvedValue({ isBase: true, code: 'YER' });

      const dto = {
        supplierId: 'sup-1',
        currencyId: 'cur-base',
        exchangeRate: 25,
        lines: [{ itemId: 'item-1', quantity: 10, unitPrice: 100 }],
      };

      await expect(
        service.create(dto as any, 'user-1', 'PROC_OFFICER' as Role),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
