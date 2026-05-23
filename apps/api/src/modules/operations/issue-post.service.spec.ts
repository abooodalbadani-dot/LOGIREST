/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { IssuePostService } from './issue-post.service';
import { PrismaService } from '../../database/prisma.service';
import { AllocationService } from '../ledger/allocation.service';
import { Prisma, Role, DocumentType } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('IssuePostService', () => {
  let service: IssuePostService;

  const mockIssueFindUnique = jest.fn();
  const mockIssueUpdate = jest.fn();
  const mockLotAllocationCreate = jest.fn();
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
      create: mockLotAllocationCreate,
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

  const mockAllocationService = {
    allocate: jest.fn(),
  } as unknown as AllocationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssuePostService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AllocationService, useValue: mockAllocationService },
      ],
    }).compile();

    service = module.get<IssuePostService>(IssuePostService);
    jest.clearAllMocks();
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
      include: { lines: { include: { item: true } } },
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
      },
    });
    expect(mockIssueUpdate).toHaveBeenCalledWith({
      where: { id: issueId },
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
});
