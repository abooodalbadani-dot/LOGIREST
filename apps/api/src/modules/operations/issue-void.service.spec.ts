/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { IssueVoidService } from './issue-void.service';
import { PrismaService } from '../../database/prisma.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
import { Prisma, Role, DocumentType } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('IssueVoidService', () => {
  let service: IssueVoidService;

  const mockIssueFindUnique = jest.fn();
  const mockIssueUpdate = jest.fn();
  const mockIssueUpdateMany = jest.fn();
  const mockWarehouseItemLotUpdate = jest.fn();
  const mockWarehouseItemUpdate = jest.fn();
  const mockStockLedgerCreate = jest.fn();
  const mockLotAllocationFindMany = jest.fn();
  const mockApprovalEventCount = jest.fn();
  const mockApprovalEventCreate = jest.fn();
  const mockAuditLogCreate = jest.fn();
  const mockCostLedgerCreate = jest.fn();

  const mockPrismaTx = {
    inventoryIssue: {
      findUnique: mockIssueFindUnique,
      update: mockIssueUpdate,
      updateMany: mockIssueUpdateMany,
    },
    costLedger: {
      create: mockCostLedgerCreate,
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
    lotAllocation: {
      findMany: mockLotAllocationFindMany,
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
    lockDocument: jest.fn(),
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
    mockLockService.lockDocument = jest.fn().mockResolvedValue({
      id: 'issue-1',
      status: 'POSTED',
      version: 1,
      warehouseId: 'wh-1',
    });
    mockIssueUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('should void a POSTED issue successfully', async () => {
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
          quantity: new Prisma.Decimal(5),
          item: {
            id: 'item-1',
            sku: 'SKU1',
            isBatched: true,
            hasExpiry: false,
          },
        },
      ],
    });

    mockLotAllocationFindMany.mockResolvedValue([
      {
        id: 'alloc-1',
        issueLineId: 'line-1',
        lotId: 'lot-1',
        quantityAllocated: new Prisma.Decimal(5),
      },
    ]);

    mockLockService.lockLots = jest
      .fn()
      .mockResolvedValue([{ lotId: 'lot-1', qtyOnHand: new Prisma.Decimal(10) }]);
    mockLockService.lockItem = jest.fn().mockResolvedValue({
      itemId: 'item-1',
      qtyOnHand: new Prisma.Decimal(10),
    });

    mockIssueUpdate.mockResolvedValue({ id: issueId, status: 'VOIDED' });
    mockApprovalEventCount.mockResolvedValue(1);

    const result = await service.void(issueId, userId, Role.ADMIN, 1);

    expect(result).toBeDefined();
    expect(mockWarehouseItemLotUpdate).toHaveBeenCalledWith({
      where: {
        warehouseId_itemId_lotId: {
          warehouseId,
          itemId: 'item-1',
          lotId: 'lot-1',
        },
      },
      data: { qtyOnHand: { increment: 5 } },
    });

    expect(mockWarehouseItemUpdate).toHaveBeenCalledWith({
      where: {
        warehouseId_itemId: {
          warehouseId,
          itemId: 'item-1',
        },
      },
      data: { qtyOnHand: { increment: 5 } },
    });

    expect(mockStockLedgerCreate).toHaveBeenCalledWith({
      data: {
        warehouseId,
        itemId: 'item-1',
        lotId: 'lot-1',
        quantity: 5,
        documentId: issueId,
        documentType: DocumentType.INVENTORY_ISSUE,
        idempotencyKey: 'INVENTORY_ISSUE:stock:issue-1:item-1:lot-1:line-1:void',
      },
    });
  });

  it('should throw BadRequestException if status is not POSTED', async () => {
    mockLockService.lockDocument = jest.fn().mockResolvedValue({
      id: 'issue-1',
      status: 'DRAFT',
    });
    mockIssueFindUnique.mockResolvedValue({
      id: 'issue-1',
      status: 'DRAFT',
    });

    await expect(service.void('issue-1', 'user-1', Role.ADMIN)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw ForbiddenException if userRole is not ADMIN or INV_MGR', async () => {
    await expect(
      service.void('issue-1', 'user-1', Role.WH_KEEPER),
    ).rejects.toThrow('Only System Administrators or Inventory Managers can void documents');
  });
});
