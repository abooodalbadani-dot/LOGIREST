import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowService } from './workflow.service';
import { PrismaService } from '../../database/prisma.service';
import { ConcurrencyService } from '../../services/concurrency.service';
import { VersionConflictException } from '../../exceptions/version-conflict.exception';
import { OutboxService } from '../outbox/outbox.service';
import {
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DocumentType as PrismaDocType } from '@prisma/client';
import { MetricsService } from '../metrics/metrics.service';

describe('WorkflowService', () => {
  let service: WorkflowService;

  const mockPrisma = {
    $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
    warehouse: {
      findUnique: jest.fn(),
    },
    warehouseLock: {
      findFirst: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    approvalEvent: {
      count: jest.fn(),
      create: jest.fn(),
    },
    purchaseRequest: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    notificationLog: {
      create: jest.fn(),
    },
    supplier: {
      findUnique: jest.fn(),
    },
  };

  const mockConcurrencyService = {
    handleConflict: jest.fn().mockImplementation(() => {
      throw new VersionConflictException(2, 'Jane Doe', new Date());
    }),
  };

  const mockOutboxService = {
    writeEvent: jest.fn().mockResolvedValue(undefined),
  };

  const mockMetricsService = {
    postingOperationsCounter: {
      inc: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConcurrencyService, useValue: mockConcurrencyService },
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: MetricsService, useValue: mockMetricsService },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
    jest.clearAllMocks();
  });

  describe('mapModelToDocType', () => {
    it('should map purchaseRequest to pr', () => {
      expect(service.mapModelToDocType('purchaseRequest')).toBe('pr');
    });

    it('should throw for unknown modelName', () => {
      expect(() => service.mapModelToDocType('unknownModel')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('mapToPrismaDocType', () => {
    it('should map pr to PURCHASE_REQUEST', () => {
      expect(service.mapToPrismaDocType('pr')).toBe(
        PrismaDocType.PURCHASE_REQUEST,
      );
    });

    it('should map issue to INVENTORY_ISSUE', () => {
      expect(service.mapToPrismaDocType('issue')).toBe(
        PrismaDocType.INVENTORY_ISSUE,
      );
    });
  });

  describe('isWarehouseLocked', () => {
    it('should return true if warehouse.isLocked is true', async () => {
      mockPrisma.warehouse.findUnique.mockResolvedValue({ isLocked: true });

      const result = await service.isWarehouseLocked('wh-1');
      expect(result).toBe(true);
    });

    it('should return true if warehouseLock exists and is not expired', async () => {
      mockPrisma.warehouse.findUnique.mockResolvedValue({ isLocked: false });
      mockPrisma.warehouseLock.findFirst.mockResolvedValue({ id: 'lock-1' });

      const result = await service.isWarehouseLocked('wh-1');
      expect(result).toBe(true);
    });

    it('should return false if warehouse is not locked and no active locks exist', async () => {
      mockPrisma.warehouse.findUnique.mockResolvedValue({ isLocked: false });
      mockPrisma.warehouseLock.findFirst.mockResolvedValue(null);

      const result = await service.isWarehouseLocked('wh-1');
      expect(result).toBe(false);
    });
  });

  describe('verifyWarehouseLocks', () => {
    it('should allow non-mutating actions', async () => {
      await expect(
        service.verifyWarehouseLocks('pr', 'SUBMIT', {}),
      ).resolves.not.toThrow();
    });

    it('should throw HttpException with HttpStatus.LOCKED if mutating action and warehouse is locked', async () => {
      mockPrisma.warehouse.findUnique.mockResolvedValue({ isLocked: true });

      const promise = service.verifyWarehouseLocks('grn', 'POST', {
        warehouseId: 'wh-1',
      });
      await expect(promise).rejects.toThrow(HttpException);
      await expect(promise).rejects.toHaveProperty('status', HttpStatus.LOCKED);
    });
  });

  describe('executeTransition', () => {
    it('should execute a valid transition successfully', async () => {
      const mockDoc = {
        id: 'doc-1',
        status: 'DRAFT',
        version: 1,
        warehouseId: 'wh-1',
        requestNumber: 'PR-2026-0001',
      };

      let callCount = 0;
      mockPrisma.purchaseRequest.findUnique.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.resolve({
            ...mockDoc,
            status: 'SUBMITTED',
            version: 2,
          });
        }
        return Promise.resolve(mockDoc);
      });
      mockPrisma.purchaseRequest.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.approvalEvent.count.mockResolvedValue(0);

      const result = await service.executeTransition(
        'doc-1',
        'purchaseRequest',
        'SUBMIT',
        'user-1',
        'PROC_OFFICER',
        'looks good',
        1,
      );

      expect(result.status).toBe('SUBMITTED');
      expect(mockPrisma.purchaseRequest.updateMany).toHaveBeenCalled();
      expect(mockPrisma.approvalEvent.create).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
      expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith({
        data: {
          targetRole: 'APPROVER',
          warehouseId: 'wh-1',
          message: 'Purchase Request PR-2026-0001 is awaiting approval.',
          documentType: 'PURCHASE_REQUEST',
          documentId: 'doc-1',
        },
      });
    });

    it('should throw ForbiddenException if role cannot perform action', async () => {
      const mockDoc = {
        id: 'doc-1',
        status: 'SUBMITTED',
        version: 1,
      };

      mockPrisma.purchaseRequest.findUnique.mockResolvedValue(mockDoc);

      await expect(
        service.executeTransition(
          'doc-1',
          'purchaseRequest',
          'APPROVE',
          'user-1',
          'WH_KEEPER', // Warehouse keeper cannot approve PR
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.auditLog.create).toHaveBeenCalled(); // Should log failed transition
    });

    it('should throw BadRequestException if transition is invalid', async () => {
      const mockDoc = {
        id: 'doc-1',
        status: 'APPROVED',
        version: 1,
      };

      mockPrisma.purchaseRequest.findUnique.mockResolvedValue(mockDoc);

      await expect(
        service.executeTransition(
          'doc-1',
          'purchaseRequest',
          'SUBMIT', // Cannot submit an approved PR
          'user-1',
          'PROC_OFFICER',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw VersionConflictException on version mismatch', async () => {
      const mockDoc = {
        id: 'doc-1',
        status: 'DRAFT',
        version: 2,
      };

      mockPrisma.purchaseRequest.findUnique.mockResolvedValue(mockDoc);

      await expect(
        service.executeTransition(
          'doc-1',
          'purchaseRequest',
          'SUBMIT',
          'user-1',
          'PROC_OFFICER',
          '',
          1, // Client expects version 1, but DB is version 2
        ),
      ).rejects.toThrow(VersionConflictException);
      expect(mockConcurrencyService.handleConflict).toHaveBeenCalledWith(
        'doc-1',
        'purchaseRequest',
        1,
        expect.any(Object),
      );
    });

    it('should throw VersionConflictException when update count is 0', async () => {
      const mockDoc = {
        id: 'doc-1',
        status: 'DRAFT',
        version: 1,
      };

      mockPrisma.purchaseRequest.findUnique.mockResolvedValue(mockDoc);
      mockPrisma.purchaseRequest.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.executeTransition(
          'doc-1',
          'purchaseRequest',
          'SUBMIT',
          'user-1',
          'PROC_OFFICER',
          '',
          1,
        ),
      ).rejects.toThrow(VersionConflictException);
      expect(mockConcurrencyService.handleConflict).toHaveBeenCalledWith(
        'doc-1',
        'purchaseRequest',
        1,
        expect.any(Object),
      );
    });
  });
});
