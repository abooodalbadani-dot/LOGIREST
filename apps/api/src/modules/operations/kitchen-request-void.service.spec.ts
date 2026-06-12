/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { KitchenRequestVoidService } from './kitchen-request-void.service';
import { IssueVoidService } from './issue-void.service';
import { LedgerLockService } from '../ledger/ledger-lock.service';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, Role } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('KitchenRequestVoidService', () => {
  let service: KitchenRequestVoidService;

  const mockIssueVoidService = { void: jest.fn() };
  const mockLockService = { lockItem: jest.fn(), lockLots: jest.fn(), lockDocument: jest.fn() };

  const mockRequestFindUnique = jest.fn();
  const mockRequestUpdate = jest.fn();
  const mockWarehouseItemFindUnique = jest.fn();
  const mockApprovalEventCount = jest.fn();
  const mockApprovalEventCreate = jest.fn();
  const mockAuditLogCreate = jest.fn();

  const mockPrismaTx = {
    kitchenRequest: {
      findUnique: mockRequestFindUnique,
      update: mockRequestUpdate,
    },
    warehouseItem: {
      findUnique: mockWarehouseItemFindUnique,
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
    $transaction: jest.fn().mockImplementation(
      (cb: (tx: Prisma.TransactionClient) => Promise<unknown>, _options?: unknown) => cb(mockPrismaTx),
    ),
  } as unknown as PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KitchenRequestVoidService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IssueVoidService, useValue: mockIssueVoidService },
        { provide: LedgerLockService, useValue: mockLockService },
      ],
    }).compile();

    service = module.get<KitchenRequestVoidService>(KitchenRequestVoidService);
    jest.clearAllMocks();
    mockLockService.lockDocument = jest.fn().mockImplementation(() => mockRequestFindUnique());
    mockWarehouseItemFindUnique.mockResolvedValue({ isFrozen: false });
  });

  it('should void a FULFILLED kitchen request successfully', async () => {
    const requestId = 'req-1';
    const userId = 'user-1';

    mockRequestFindUnique.mockResolvedValue({
      id: requestId,
      warehouseId: 'wh-1',
      status: 'FULFILLED',
      version: 1,
      items: [{ itemId: 'item-1', item: { sku: 'SKU1' } }],
      issue: null,
    });

    mockRequestUpdate.mockResolvedValue({ id: requestId, status: 'VOIDED' });
    mockApprovalEventCount.mockResolvedValue(1);

    const result = await service.void(requestId, userId, Role.ADMIN, 1);

    expect(result).toBeDefined();
    expect(mockRequestUpdate).toHaveBeenCalledWith({
      where: { id: requestId },
      data: { status: 'VOIDED', version: 2 },
    });
  });

  it('should throw BadRequestException if any item is frozen', async () => {
    const requestId = 'req-1';
    const userId = 'user-1';

    mockRequestFindUnique.mockResolvedValue({
      id: requestId,
      warehouseId: 'wh-1',
      status: 'FULFILLED',
      version: 1,
      items: [{ itemId: 'item-1', item: { sku: 'SKU1' } }],
      issue: null,
    });

    mockWarehouseItemFindUnique.mockResolvedValue({ isFrozen: true });

    await expect(service.void(requestId, userId, Role.ADMIN, 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException if status is not FULFILLED', async () => {
    mockRequestFindUnique.mockResolvedValue({
      id: 'req-1',
      warehouseId: 'wh-1',
      status: 'DRAFT',
      items: [],
      issue: null,
    });

    await expect(service.void('req-1', 'user-1', Role.ADMIN)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw ForbiddenException if userRole is not ADMIN or INV_MGR', async () => {
    await expect(
      service.void('req-1', 'user-1', Role.WH_KEEPER),
    ).rejects.toThrow('Only System Administrators or Inventory Managers can void documents');
  });
});
