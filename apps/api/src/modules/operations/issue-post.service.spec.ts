/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { IssuePostService } from './issue-post.service';
import { PrismaService } from '../../database/prisma.service';
import { AllocationService } from '../ledger/allocation.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
import { OutboxService } from '../outbox/outbox.service';
import { Prisma, Role, DocumentType } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MetricsService } from '../metrics/metrics.service';
import { ScopeValidationService } from '../../auth/scope-validation.service';

describe('IssuePostService', () => {
  let service: IssuePostService;

  const mockMetricsService = {
    postingOperationsCounter: {
      inc: jest.fn(),
    },
  };

  const mockIssueFindUnique = jest.fn();
  const mockIssueUpdate = jest.fn();
  const mockIssueUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
  const mockLotAllocationCreate = jest.fn();
  const mockStockLedgerCreate = jest.fn();
  const mockApprovalEventCount = jest.fn();
  const mockApprovalEventCreate = jest.fn();
  const mockAuditLogCreate = jest.fn();
  const mockWarehouseItemFindUnique = jest.fn();

  const mockPrismaTx = {
    inventoryIssue: {
      findUnique: mockIssueFindUnique,
      update: mockIssueUpdate,
      updateMany: mockIssueUpdateMany,
    },
    lotAllocation: {
      create: mockLotAllocationCreate,
    },
    stockLedger: {
      create: mockStockLedgerCreate,
      findFirst: jest.fn().mockResolvedValue(null),
    },
    approvalEvent: {
      count: mockApprovalEventCount,
      create: mockApprovalEventCreate,
    },
    auditLog: {
      create: mockAuditLogCreate,
    },
    warehouseItem: {
      findUnique: mockWarehouseItemFindUnique,
    },
    notificationLog: {
      create: jest.fn(),
    },
    kitchenRequest: {
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
    kitchenRequestItem: {
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
  } as unknown as Prisma.TransactionClient;

  const mockPrisma = {
    $transaction: jest
      .fn()
      .mockImplementation(
        (cb: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
          cb(mockPrismaTx),
      ),
  } as unknown as PrismaService;

  const mockAllocationService = {
    allocate: jest.fn(),
  } as unknown as AllocationService;

  const mockLockService = {
    lockDocument: jest.fn(),
  } as unknown as LedgerLockService;

  const mockOutboxService = {
    writeEvent: jest.fn().mockResolvedValue(undefined),
  };

  const mockScopeValidationService = {
    validateWarehouse: jest.fn().mockResolvedValue(undefined),
    checkWarehouseItemQuarantine: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssuePostService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AllocationService, useValue: mockAllocationService },
        { provide: LedgerLockService, useValue: mockLockService },
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: ScopeValidationService, useValue: mockScopeValidationService },
      ],
    }).compile();

    service = module.get<IssuePostService>(IssuePostService);
    mockScopeValidationService.validateWarehouse.mockReset();
    mockScopeValidationService.validateWarehouse.mockResolvedValue(undefined);
    mockScopeValidationService.checkWarehouseItemQuarantine.mockReset();
    mockScopeValidationService.checkWarehouseItemQuarantine.mockResolvedValue(undefined);
    (mockLockService.lockDocument as jest.Mock).mockReset();
    (mockLockService.lockDocument as jest.Mock).mockImplementation(() => mockIssueFindUnique());
    jest.clearAllMocks();
    mockWarehouseItemFindUnique.mockResolvedValue(null);
  });

  it('should post SUBMITTED inventory issue successfully', async () => {
    const issueId = 'issue-1';
    const userId = 'user-1';
    const warehouseId = 'wh-1';

    mockIssueFindUnique.mockResolvedValue({
      id: issueId,
      warehouseId,
      status: 'SUBMITTED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          quantity: new Prisma.Decimal(10),
          item: {
            id: 'item-1',
            sku: 'SKU1',
            isBatched: true,
            hasExpiry: false,
          },
        },
      ],
    });

    mockIssueUpdate.mockResolvedValue({ id: issueId, status: 'POSTED' });
    mockAllocationService.allocate = jest
      .fn()
      .mockResolvedValue([{ lotId: 'lot-1', quantityAllocated: 10 }]);
    mockApprovalEventCount.mockResolvedValue(0);

    const result = await service.post(issueId, userId, Role.INV_MGR, 1);

    expect(result).toBeDefined();
    expect(mockIssueFindUnique).toHaveBeenCalledWith({
      where: { id: issueId },
      include: {
        lines: {
          include: {
            item: {
              include: {
                uomConversions: { select: { fromUomId: true, toUomId: true, factor: true } },
              },
            },
          },
        },
      },
    });
    expect(mockAllocationService.allocate).toHaveBeenCalledWith(
      mockPrismaTx,
      warehouseId,
      'item-1',
      10,
    );
    expect(mockLotAllocationCreate).toHaveBeenCalledWith({
      data: {
        issueLineId: 'line-1',
        lotId: 'lot-1',
        quantityAllocated: 10,
      },
    });
    expect(mockStockLedgerCreate).toHaveBeenCalledWith({
      data: {
        warehouseId,
        itemId: 'item-1',
        lotId: 'lot-1',
        quantity: -10,
        documentId: issueId,
        documentType: DocumentType.INVENTORY_ISSUE,
        idempotencyKey: 'INVENTORY_ISSUE:stock:issue-1:item-1:lot-1:line-1',
      },
    });
    expect(mockIssueUpdateMany).toHaveBeenCalledWith({
      where: { id: issueId, version: 1 },
      data: { status: 'POSTED', version: 2 },
    });
    expect(mockApprovalEventCreate).toHaveBeenCalled();
    expect(mockAuditLogCreate).toHaveBeenCalled();
  });

  it('should throw NotFoundException if Issue does not exist', async () => {
    mockIssueFindUnique.mockResolvedValue(null);
    await expect(
      service.post('invalid', 'user-1', Role.INV_MGR),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if Issue is not SUBMITTED', async () => {
    mockIssueFindUnique.mockResolvedValue({
      id: 'issue-1',
      status: 'DRAFT',
    });
    await expect(
      service.post('issue-1', 'user-1', Role.INV_MGR),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if version mismatch occurs', async () => {
    mockIssueFindUnique.mockResolvedValue({
      id: 'issue-1',
      status: 'SUBMITTED',
      version: 2,
    });
    await expect(
      service.post('issue-1', 'user-1', Role.INV_MGR, 1),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if item is frozen in source warehouse', async () => {
    const issueId = 'issue-1';
    const userId = 'user-1';
    const warehouseId = 'wh-1';

    mockIssueFindUnique.mockResolvedValue({
      id: issueId,
      warehouseId,
      status: 'SUBMITTED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          quantity: new Prisma.Decimal(10),
          item: {
            id: 'item-1',
            sku: 'SKU1',
            isBatched: true,
            hasExpiry: false,
          },
        },
      ],
    });

    mockScopeValidationService.checkWarehouseItemQuarantine.mockRejectedValue(
      new BadRequestException('Cannot post issue: Item SKU1 is frozen/locked in source warehouse'),
    );

    await expect(
      service.post(issueId, userId, Role.INV_MGR, 1),
    ).rejects.toThrow(new BadRequestException('Cannot post issue: Item SKU1 is frozen/locked in source warehouse'));
  });

  it('should post issue successfully and update linked KitchenRequest with requestedById in outbox event payload', async () => {
    const issueId = 'issue-1';
    const userId = 'user-1';
    const warehouseId = 'wh-1';

    mockIssueFindUnique.mockResolvedValue({
      id: issueId,
      warehouseId,
      status: 'SUBMITTED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          quantity: new Prisma.Decimal(10),
          item: {
            id: 'item-1',
            sku: 'SKU1',
            isBatched: true,
            hasExpiry: false,
          },
        },
      ],
    });

    const mockKitchenRequest = {
      id: 'kr-1',
      requestNumber: 'KR-001',
      warehouseId,
      requestedById: 'chef-1',
      status: 'SUBMITTED',
    };

    const mockKitchenRequestItem = {
      id: 'kri-1',
      requestId: 'kr-1',
      itemId: 'item-1',
      quantity: 10,
      quantityFulfilled: 0,
    };

    (mockPrismaTx.kitchenRequest.findFirst as jest.Mock).mockResolvedValue(mockKitchenRequest);
    (mockPrismaTx.kitchenRequestItem.findFirst as jest.Mock).mockResolvedValue(mockKitchenRequestItem);
    mockIssueUpdate.mockResolvedValue({ id: issueId, status: 'POSTED' });
    mockAllocationService.allocate = jest
      .fn()
      .mockResolvedValue([{ lotId: 'lot-1', quantityAllocated: 10 }]);
    mockApprovalEventCount.mockResolvedValue(0);

    const result = await service.post(issueId, userId, Role.INV_MGR, 1);

    expect(result).toBeDefined();
    expect(mockPrismaTx.kitchenRequest.update).toHaveBeenCalledWith({
      where: { id: mockKitchenRequest.id },
      data: {
        status: 'FULFILLED',
        version: { increment: 1 },
      },
    });

    expect(mockOutboxService.writeEvent).toHaveBeenCalledWith(
      mockPrismaTx,
      'KITCHEN_REQUEST_POSTED',
      {
        id: mockKitchenRequest.id,
        documentNumber: mockKitchenRequest.requestNumber,
        warehouseId: mockKitchenRequest.warehouseId,
        requestedById: mockKitchenRequest.requestedById,
      },
    );
  });
});
