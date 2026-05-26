import { Test, TestingModule } from '@nestjs/testing';
import { KitchenRequestVoidService } from '../kitchen-request-void.service';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, Role, DocumentType } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('KitchenRequestVoidService', () => {
  let service: KitchenRequestVoidService;

  const mockKitchenRequestFindUnique = jest.fn();
  const mockKitchenRequestUpdate = jest.fn();
  const mockApprovalEventCount = jest.fn();
  const mockApprovalEventCreate = jest.fn();
  const mockAuditLogCreate = jest.fn();

  const mockPrismaTx = {
    kitchenRequest: {
      findUnique: mockKitchenRequestFindUnique,
      update: mockKitchenRequestUpdate,
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KitchenRequestVoidService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<KitchenRequestVoidService>(KitchenRequestVoidService);
    jest.clearAllMocks();
  });

  it('should void a FULFILLED kitchen request successfully', async () => {
    const krId = 'kr-1';
    const userId = 'user-1';

    mockKitchenRequestFindUnique.mockResolvedValue({
      id: krId,
      status: 'FULFILLED',
      version: 1,
    });

    mockKitchenRequestUpdate.mockResolvedValue({ id: krId, status: 'VOIDED' });
    mockApprovalEventCount.mockResolvedValue(0);

    const result = await service.void(krId, userId, Role.ADMIN, 1);

    expect(result).toBeDefined();
    expect(mockKitchenRequestUpdate).toHaveBeenCalledWith({
      where: { id: krId },
      data: { status: 'VOIDED', version: 2 },
    });
    expect(mockApprovalEventCreate).toHaveBeenCalled();
    expect(mockAuditLogCreate).toHaveBeenCalled();
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
      status: 'DRAFT',
    });

    await expect(service.void('kr-1', 'user-1', Role.ADMIN)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException if version mismatch', async () => {
    mockKitchenRequestFindUnique.mockResolvedValue({
      id: 'kr-1',
      status: 'FULFILLED',
      version: 2,
    });

    await expect(service.void('kr-1', 'user-1', Role.ADMIN, 1)).rejects.toThrow(
      BadRequestException,
    );
  });
});
