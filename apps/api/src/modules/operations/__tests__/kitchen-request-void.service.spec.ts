import { Test, TestingModule } from '@nestjs/testing';
import { KitchenRequestVoidService } from '../kitchen-request-void.service';
import { IssueVoidService } from '../issue-void.service';
import { LedgerLockService } from '../../ledger/ledger-lock.service';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, Role, DocumentType } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('KitchenRequestVoidService', () => {
  let service: KitchenRequestVoidService;
  let mockIssueVoidService: jest.Mocked<Pick<IssueVoidService, 'void'>>;
  let mockLockService: jest.Mocked<
    Pick<LedgerLockService, 'lockItem' | 'lockLots' | 'lockDocument'>
  >;

  const mockKitchenRequestFindUnique = jest.fn();
  const mockKitchenRequestUpdate = jest.fn();
  const mockWarehouseItemFindUnique = jest.fn();
  const mockApprovalEventCount = jest.fn();
  const mockApprovalEventCreate = jest.fn();
  const mockAuditLogCreate = jest.fn();

  const mockPrismaTx = {
    kitchenRequest: {
      findUnique: mockKitchenRequestFindUnique,
      update: mockKitchenRequestUpdate,
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

  const mockTransaction = jest
    .fn()
    .mockImplementation((cb: any, _options?: any) => cb(mockPrismaTx));
  const mockPrisma = {
    $transaction: mockTransaction,
  } as unknown as PrismaService;

  beforeEach(async () => {
    mockIssueVoidService = {
      void: jest.fn(),
    };
    mockLockService = {
      lockItem: jest.fn(),
      lockLots: jest.fn(),
      lockDocument: jest.fn(),
    } as any;

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
    mockLockService.lockDocument = jest.fn().mockImplementation(() => mockKitchenRequestFindUnique());
    mockWarehouseItemFindUnique.mockResolvedValue({ isFrozen: false });
  });

  it('should void a FULFILLED kitchen request successfully without linked issue', async () => {
    const krId = 'kr-1';
    const userId = 'user-1';

    mockKitchenRequestFindUnique.mockResolvedValue({
      id: krId,
      warehouseId: 'wh-1',
      status: 'FULFILLED',
      version: 1,
      items: [{ itemId: 'item-1', item: { sku: 'SKU1' } }],
      inventoryIssue: null,
    });

    mockKitchenRequestUpdate.mockResolvedValue({ id: krId, status: 'VOIDED' });
    mockApprovalEventCount.mockResolvedValue(0);

    const result: unknown = await service.void(krId, userId, Role.ADMIN, 1);

    expect(result).toBeDefined();
    expect(mockKitchenRequestUpdate).toHaveBeenCalledWith({
      where: { id: krId },
      data: { status: 'VOIDED', version: 2 },
    });
    expect(mockApprovalEventCreate).toHaveBeenCalled();
    expect(mockAuditLogCreate).toHaveBeenCalled();
    expect(mockLockService.lockItem).not.toHaveBeenCalled();
    expect(mockIssueVoidService.void).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if kitchen request does not exist', async () => {
    mockKitchenRequestFindUnique.mockResolvedValue(null);

    await expect(service.void('invalid', 'user-1', Role.ADMIN)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw BadRequestException if kitchen request is not FULFILLED', async () => {
    mockKitchenRequestFindUnique.mockResolvedValue({
      id: 'kr-1',
      warehouseId: 'wh-1',
      status: 'DRAFT',
      items: [],
      inventoryIssue: null,
    });

    await expect(service.void('kr-1', 'user-1', Role.ADMIN)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException if version mismatch', async () => {
    mockKitchenRequestFindUnique.mockResolvedValue({
      id: 'kr-1',
      warehouseId: 'wh-1',
      status: 'FULFILLED',
      version: 2,
      items: [{ itemId: 'item-1', item: { sku: 'SKU1' } }],
      inventoryIssue: null,
    });

    await expect(service.void('kr-1', 'user-1', Role.ADMIN, 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException if any item is frozen', async () => {
    const krId = 'kr-1';
    const userId = 'user-1';

    mockKitchenRequestFindUnique.mockResolvedValue({
      id: krId,
      warehouseId: 'wh-1',
      status: 'FULFILLED',
      version: 1,
      items: [{ itemId: 'item-1', item: { sku: 'SKU1' } }],
      inventoryIssue: null,
    });

    mockWarehouseItemFindUnique.mockResolvedValue({
      isFrozen: true,
    });

    await expect(service.void(krId, userId, Role.ADMIN, 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should void a FULFILLED kitchen request and reverse stock when linked issue exists', async () => {
    const krId = 'kr-1';
    const issueId = 'issue-1';
    const userId = 'user-1';

    mockKitchenRequestFindUnique.mockResolvedValue({
      id: krId,
      warehouseId: 'wh-1',
      status: 'FULFILLED',
      version: 1,
      items: [{ itemId: 'item-1', item: { sku: 'SKU1' } }],
      inventoryIssue: { id: issueId, version: 1 },
    });

    mockKitchenRequestUpdate.mockResolvedValue({ id: krId, status: 'VOIDED' });
    mockApprovalEventCount.mockResolvedValue(0);
    mockLockService.lockItem.mockResolvedValue({
      wac: new Prisma.Decimal(10),
      qtyOnHand: new Prisma.Decimal(100),
    } as any);
    mockIssueVoidService.void.mockResolvedValue(undefined);

    const result: unknown = await service.void(krId, userId, Role.ADMIN, 1);

    expect(result).toBeDefined();
    expect(mockLockService.lockDocument).toHaveBeenCalledWith(
      mockPrismaTx,
      krId,
      DocumentType.KITCHEN_REQUEST,
    );
    expect(mockIssueVoidService.void).toHaveBeenCalledWith(
      issueId,
      userId,
      Role.ADMIN,
      1,
      undefined,
      mockPrismaTx,
    );
    expect(mockKitchenRequestUpdate).toHaveBeenCalledWith({
      where: { id: krId },
      data: { status: 'VOIDED', version: 2 },
    });
  });

  it('should rollback transaction if issueVoidService throws', async () => {
    const krId = 'kr-1';
    const issueId = 'issue-1';
    const userId = 'user-1';

    mockKitchenRequestFindUnique.mockResolvedValue({
      id: krId,
      warehouseId: 'wh-1',
      status: 'FULFILLED',
      version: 1,
      items: [{ itemId: 'item-1', item: { sku: 'SKU1' } }],
      inventoryIssue: { id: issueId, version: 1 },
    });

    mockLockService.lockItem.mockResolvedValue({
      wac: new Prisma.Decimal(10),
    } as any);
    mockIssueVoidService.void.mockRejectedValue(
      new BadRequestException('Issue cannot be voided'),
    );

    await expect(service.void(krId, userId, Role.ADMIN, 1)).rejects.toThrow(
      BadRequestException,
    );
    expect(mockKitchenRequestUpdate).not.toHaveBeenCalled();
    expect(mockApprovalEventCreate).not.toHaveBeenCalled();
    expect(mockAuditLogCreate).not.toHaveBeenCalled();
  });

  it('should use Serializable isolation level for the transaction', async () => {
    const krId = 'kr-1';
    const userId = 'user-1';

    mockKitchenRequestFindUnique.mockResolvedValue({
      id: krId,
      warehouseId: 'wh-1',
      status: 'FULFILLED',
      version: 1,
      items: [{ itemId: 'item-1', item: { sku: 'SKU1' } }],
      inventoryIssue: null,
    });
    mockKitchenRequestUpdate.mockResolvedValue({ id: krId, status: 'VOIDED' });
    mockApprovalEventCount.mockResolvedValue(0);

    await service.void(krId, userId, Role.ADMIN, 1);

    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it('should acquire FOR UPDATE lock on the kitchen request document', async () => {
    const krId = 'kr-1';
    const issueId = 'issue-1';
    const userId = 'user-1';

    mockKitchenRequestFindUnique.mockResolvedValue({
      id: krId,
      warehouseId: 'wh-1',
      status: 'FULFILLED',
      version: 1,
      items: [
        { itemId: 'item-1', item: { sku: 'SKU1' } },
        { itemId: 'item-2', item: { sku: 'SKU2' } },
      ],
      inventoryIssue: { id: issueId, version: 1 },
    });

    mockKitchenRequestUpdate.mockResolvedValue({ id: krId, status: 'VOIDED' });
    mockApprovalEventCount.mockResolvedValue(0);
    mockIssueVoidService.void.mockResolvedValue(undefined);

    await service.void(krId, userId, Role.ADMIN, 1);

    expect(mockLockService.lockDocument).toHaveBeenCalledWith(
      mockPrismaTx,
      krId,
      DocumentType.KITCHEN_REQUEST,
    );
  });
});
