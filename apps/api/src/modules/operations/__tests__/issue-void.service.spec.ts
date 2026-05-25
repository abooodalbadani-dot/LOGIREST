import { Test, TestingModule } from '@nestjs/testing';
import { IssueVoidService } from '../issue-void.service';
import { PrismaService } from '../../../database/prisma.service';
import { LedgerLockService } from '../../ledger/ledger-lock.service';
import { Prisma, Role, DocumentType } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('IssueVoidService', () => {
  let service: IssueVoidService;

  const mockIssueFindUnique = jest.fn();
  const mockIssueUpdate = jest.fn();
  const mockLotAllocationFindMany = jest.fn();
  const mockWarehouseItemLotUpdate = jest.fn();
  const mockWarehouseItemUpdate = jest.fn();
  const mockStockLedgerCreate = jest.fn();
  const mockApprovalEventCount = jest.fn();
  const mockApprovalEventCreate = jest.fn();
  const mockAuditLogCreate = jest.fn();

  const mockPrismaTx = {
    inventoryIssue: {
      findUnique: mockIssueFindUnique,
      update: mockIssueUpdate,
    },
    lotAllocation: {
      findMany: mockLotAllocationFindMany,
    },
    warehouseItemLot: {
      update: mockWarehouseItemLotUpdate,
    },
    warehouseItem: {
      update: mockWarehouseItemUpdate,
    },
    stockLedger: {
      create: mockStockLedgerCreate,
    },
    approvalEvent: {
      count: mockApprovalEventCount,
      create: mockApprovalEventCreate,
    },
    auditLog: {
      create: mockAuditLogCreate,
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

  const mockLockService = {
    lockLots: jest.fn(),
    lockItem: jest.fn(),
  } as unknown as LedgerLockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssueVoidService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerLockService, useValue: mockLockService },
      ],
    }).compile();

    service = module.get<IssueVoidService>(IssueVoidService);
    jest.clearAllMocks();
  });

  it('should void a POSTED inventory issue successfully (unbatched item)', async () => {
    const issueId = 'issue-1';
    const userId = 'user-1';
    const warehouseId = 'wh-1';

    mockIssueFindUnique.mockResolvedValue({
      id: issueId,
      warehouseId,
      status: 'POSTED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          quantity: new Prisma.Decimal(10),
          item: {
            id: 'item-1',
            sku: 'SKU1',
            isBatched: false,
            hasExpiry: false,
          },
        },
      ],
    });

    mockLockService.lockItem = jest.fn().mockResolvedValue({
      itemId: 'item-1',
      qtyOnHand: new Prisma.Decimal(5),
    });

    mockIssueUpdate.mockResolvedValue({ id: issueId, status: 'VOIDED' });
    mockApprovalEventCount.mockResolvedValue(0);

    const result = await service.void(issueId, userId, Role.ADMIN, 1);

    expect(result).toBeDefined();
    expect(mockWarehouseItemUpdate).toHaveBeenCalledWith({
      where: {
        warehouseId_itemId: {
          warehouseId,
          itemId: 'item-1',
        },
      },
      data: { qtyOnHand: { increment: 10 } },
    });
    expect(mockStockLedgerCreate).toHaveBeenCalledWith({
      data: {
        warehouseId,
        itemId: 'item-1',
        lotId: null,
        quantity: 10,
        documentId: issueId,
        documentType: DocumentType.INVENTORY_ISSUE,
      },
    });
    expect(mockIssueUpdate).toHaveBeenCalledWith({
      where: { id: issueId },
      data: { status: 'VOIDED', version: 2 },
    });
    expect(mockApprovalEventCreate).toHaveBeenCalled();
    expect(mockAuditLogCreate).toHaveBeenCalled();
  });

  it('should void a POSTED inventory issue with batched item and lot allocations', async () => {
    const issueId = 'issue-2';
    const userId = 'user-1';
    const warehouseId = 'wh-1';

    mockIssueFindUnique.mockResolvedValue({
      id: issueId,
      warehouseId,
      status: 'POSTED',
      version: 1,
      lines: [
        {
          id: 'line-1',
          itemId: 'item-1',
          quantity: new Prisma.Decimal(10),
          item: {
            id: 'item-1',
            sku: 'SKU-BATCH',
            isBatched: true,
            hasExpiry: false,
          },
        },
      ],
    });

    mockLotAllocationFindMany.mockResolvedValue([
      { lotId: 'lot-1', quantityAllocated: new Prisma.Decimal(6) },
      { lotId: 'lot-2', quantityAllocated: new Prisma.Decimal(4) },
    ]);

    mockLockService.lockLots = jest.fn().mockResolvedValue([]);
    mockLockService.lockItem = jest.fn().mockResolvedValue({
      itemId: 'item-1',
      qtyOnHand: new Prisma.Decimal(5),
    });

    mockIssueUpdate.mockResolvedValue({ id: issueId, status: 'VOIDED' });
    mockApprovalEventCount.mockResolvedValue(0);

    const result = await service.void(issueId, userId, Role.ADMIN, 1);

    expect(result).toBeDefined();
    expect(mockWarehouseItemLotUpdate).toHaveBeenCalledTimes(2);
    expect(mockStockLedgerCreate).toHaveBeenCalledTimes(2);
    expect(mockWarehouseItemLotUpdate).toHaveBeenNthCalledWith(1, {
      where: {
        warehouseId_itemId_lotId: {
          warehouseId,
          itemId: 'item-1',
          lotId: 'lot-1',
        },
      },
      data: { qtyOnHand: { increment: 6 } },
    });
    expect(mockWarehouseItemLotUpdate).toHaveBeenNthCalledWith(2, {
      where: {
        warehouseId_itemId_lotId: {
          warehouseId,
          itemId: 'item-1',
          lotId: 'lot-2',
        },
      },
      data: { qtyOnHand: { increment: 4 } },
    });
    expect(mockWarehouseItemUpdate).toHaveBeenCalledWith({
      where: {
        warehouseId_itemId: {
          warehouseId,
          itemId: 'item-1',
        },
      },
      data: { qtyOnHand: { increment: 10 } },
    });
  });

  it('should throw NotFoundException if Issue does not exist', async () => {
    mockIssueFindUnique.mockResolvedValue(null);

    await expect(service.void('invalid', 'user-1', Role.ADMIN)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw BadRequestException if Issue is not POSTED', async () => {
    mockIssueFindUnique.mockResolvedValue({
      id: 'issue-1',
      status: 'DRAFT',
    });

    await expect(service.void('issue-1', 'user-1', Role.ADMIN)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException on version conflict', async () => {
    mockIssueFindUnique.mockResolvedValue({
      id: 'issue-1',
      status: 'POSTED',
      version: 2,
    });

    await expect(
      service.void('issue-1', 'user-1', Role.ADMIN, 1),
    ).rejects.toThrow(BadRequestException);
  });
});
