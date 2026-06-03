import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseRequestsService } from './purchase-requests.service';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import { DocumentNumberService } from '../sequencing/document-number.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

describe('PurchaseRequestsService', () => {
  let service: PurchaseRequestsService;

  const mockPrisma = {
    purchaseRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    purchaseOrder: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest
      .fn()
      .mockImplementation((cb: (tx: any) => Promise<unknown>) =>
        cb(mockPrisma),
      ),
  };

  const mockWorkflowService = {
    executeTransition: jest.fn(),
  };

  const mockDocumentNumberService = {
    generateNext: jest.fn().mockImplementation((tx, type) => {
      return `${type}-SEQ-00001`;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseRequestsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WorkflowService, useValue: mockWorkflowService },
        {
          provide: DocumentNumberService,
          useValue: mockDocumentNumberService,
        },
      ],
    }).compile();

    service = module.get<PurchaseRequestsService>(PurchaseRequestsService);
    jest.clearAllMocks();
    mockPrisma.purchaseOrder.findFirst.mockResolvedValue(null);
  });

  describe('create', () => {
    it('should create a purchase request in DRAFT status', async () => {
      const body = {
        branchId: 'branch-1',
        warehouseId: 'wh-1',
        lines: [{ itemId: 'item-1', quantity: 10 }],
      };
      const userId = 'user-1';

      mockPrisma.purchaseRequest.create.mockResolvedValue({
        id: 'pr-1',
        requestNumber: 'PURCHASE_REQUEST-SEQ-00001',
        status: 'DRAFT',
        branchId: 'branch-1',
        warehouseId: 'wh-1',
        createdById: userId,
        lines: [{ id: 'line-1', itemId: 'item-1', quantity: 10 }],
      });

      const result = await service.create(body, userId);

      expect(result.status).toBe('DRAFT');
      expect(mockPrisma.purchaseRequest.create).toHaveBeenCalledWith({
        data: {
          requestNumber: 'PURCHASE_REQUEST-SEQ-00001',
          branchId: 'branch-1',
          warehouseId: 'wh-1',
          createdById: userId,
          status: 'DRAFT',
          lines: {
            create: [{ itemId: 'item-1', quantity: 10 }],
          },
        },
        include: {
          lines: {
            include: {
              item: {
                include: {
                  unitOfMeasure: true,
                },
              },
            },
          },
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return the purchase request if it exists', async () => {
      const mockPr = {
        id: 'pr-1',
        requestNumber: 'PR-123',
        status: 'DRAFT',
        lines: [],
        createdBy: {
          id: 'u-1',
          name: 'John Doe',
          email: 'j@example.com',
          role: 'PROC_OFFICER',
        },
      };
      mockPrisma.purchaseRequest.findUnique.mockResolvedValue(mockPr);

      const result = await service.findOne('pr-1');
      expect(result).toEqual(mockPr);
      expect(mockPrisma.purchaseRequest.findUnique).toHaveBeenCalledWith({
        where: { id: 'pr-1' },
        include: {
          lines: {
            include: {
              item: {
                include: {
                  unitOfMeasure: true,
                },
              },
            },
          },
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });
    });

    it('should throw NotFoundException if purchase request does not exist', async () => {
      mockPrisma.purchaseRequest.findUnique.mockResolvedValue(null);

      await expect(service.findOne('pr-2')).rejects.toThrow(NotFoundException);
    });
  });

  describe('workflow operations', () => {
    it('submit should call executeTransition with SUBMIT', async () => {
      mockWorkflowService.executeTransition.mockResolvedValue({
        id: 'pr-1',
        status: 'SUBMITTED',
      });

      const result = await service.submit('pr-1', 'user-1', 'PROC_OFFICER', {
        comments: 'submitting',
        version: 1,
        ipAddress: '127.0.0.1',
      });

      expect(result.status).toBe('SUBMITTED');
      expect(mockWorkflowService.executeTransition).toHaveBeenCalledWith(
        'pr-1',
        'purchaseRequest',
        'SUBMIT',
        'user-1',
        'PROC_OFFICER',
        'submitting',
        1,
        '127.0.0.1',
      );
    });

    it('approve should call executeTransition with APPROVE', async () => {
      mockWorkflowService.executeTransition.mockResolvedValue({
        id: 'pr-1',
        status: 'APPROVED',
      });

      const result = await service.approve('pr-1', 'user-1', 'APPROVER', {
        comments: 'approved',
        version: 1,
        ipAddress: '127.0.0.1',
      });

      expect(result.status).toBe('APPROVED');
      expect(mockWorkflowService.executeTransition).toHaveBeenCalledWith(
        'pr-1',
        'purchaseRequest',
        'APPROVE',
        'user-1',
        'APPROVER',
        'approved',
        1,
        '127.0.0.1',
      );
    });

    it('reject should call executeTransition with REJECT', async () => {
      mockWorkflowService.executeTransition.mockResolvedValue({
        id: 'pr-1',
        status: 'REJECTED',
      });

      const result = await service.reject('pr-1', 'user-1', 'APPROVER', {
        comments: 'rejected',
        version: 1,
        ipAddress: '127.0.0.1',
      });

      expect(result.status).toBe('REJECTED');
      expect(mockWorkflowService.executeTransition).toHaveBeenCalledWith(
        'pr-1',
        'purchaseRequest',
        'REJECT',
        'user-1',
        'APPROVER',
        'rejected',
        1,
        '127.0.0.1',
      );
    });
  });

  describe('convertToPo', () => {
    it('should convert an APPROVED purchase request to a DRAFT purchase order', async () => {
      const mockPr = {
        id: 'pr-1',
        status: 'APPROVED',
        lines: [
          { itemId: 'item-1', quantity: 10 },
          { itemId: 'item-2', quantity: 5 },
        ],
      };

      mockPrisma.purchaseRequest.findUnique.mockResolvedValue(mockPr);
      mockWorkflowService.executeTransition.mockResolvedValue({
        id: 'pr-1',
        status: 'CONVERTED',
      });
      mockPrisma.purchaseOrder.create.mockResolvedValue({
        id: 'po-1',
        poNumber: 'PO-12345',
        prId: 'pr-1',
        supplierId: 'supplier-1',
        currencyId: 'currency-1',
        status: 'DRAFT',
        lines: [
          { itemId: 'item-1', quantity: 10, unitPrice: 15 },
          { itemId: 'item-2', quantity: 5, unitPrice: 20 },
        ],
      });

      const body = {
        supplierId: 'supplier-1',
        currencyId: 'currency-1',
        comments: 'converting',
        version: 1,
        lines: [
          { itemId: 'item-1', unitPrice: 15 },
          { itemId: 'item-2', unitPrice: 20 },
        ],
        ipAddress: '127.0.0.1',
      };

      const result = await service.convertToPo(
        'pr-1',
        'user-1',
        'PROC_OFFICER',
        body,
      );

      expect(result.status).toBe('DRAFT');
      expect(mockWorkflowService.executeTransition).toHaveBeenCalledWith(
        'pr-1',
        'purchaseRequest',
        'CONVERT_TO_PO',
        'user-1',
        'PROC_OFFICER',
        'converting',
        1,
        '127.0.0.1',
        mockPrisma,
      );
      expect(mockPrisma.purchaseOrder.create).toHaveBeenCalledWith({
        data: {
          poNumber: 'PURCHASE_ORDER-SEQ-00001',
          prId: 'pr-1',
          supplierId: 'supplier-1',
          currencyId: 'currency-1',
          status: 'DRAFT',
          lines: {
            create: [
              { itemId: 'item-1', quantity: 10, unitPrice: 15 },
              { itemId: 'item-2', quantity: 5, unitPrice: 20 },
            ],
          },
        },
        include: {
          lines: true,
        },
      });
    });

    it('should throw NotFoundException if purchase request does not exist', async () => {
      mockPrisma.purchaseRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.convertToPo('pr-2', 'user-1', 'PROC_OFFICER', {
          supplierId: 'sup-1',
          currencyId: 'cur-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if purchase request status is not APPROVED', async () => {
      mockPrisma.purchaseRequest.findUnique.mockResolvedValue({
        id: 'pr-1',
        status: 'DRAFT',
        lines: [],
      });

      await expect(
        service.convertToPo('pr-1', 'user-1', 'PROC_OFFICER', {
          supplierId: 'sup-1',
          currencyId: 'cur-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if purchase request has already been converted to a PO', async () => {
      mockPrisma.purchaseRequest.findUnique.mockResolvedValue({
        id: 'pr-1',
        status: 'APPROVED',
        lines: [],
      });
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        poNumber: 'PO-12345',
        prId: 'pr-1',
      });

      await expect(
        service.convertToPo('pr-1', 'user-1', 'PROC_OFFICER', {
          supplierId: 'sup-1',
          currencyId: 'cur-1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if unit price is missing for any PR line item', async () => {
      mockPrisma.purchaseRequest.findUnique.mockResolvedValue({
        id: 'pr-1',
        status: 'APPROVED',
        lines: [{ itemId: 'item-1', quantity: 10 }],
      });

      await expect(
        service.convertToPo('pr-1', 'user-1', 'PROC_OFFICER', {
          supplierId: 'sup-1',
          currencyId: 'cur-1',
          lines: [], // No unitPrice for item-1
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
