/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { LandedCostRevaluationConsumer } from './landed-cost-revaluation.consumer';
import { PrismaService } from '../../../database/prisma.service';
import { RevaluationLockingService } from './revaluation-locking.service';
import { Prisma } from '@prisma/client';
import { Job } from 'bullmq';

describe('LandedCostRevaluationConsumer', () => {
  let consumer: LandedCostRevaluationConsumer;
  let prisma: PrismaService;

  const mockLandedCostVoucherUpdate = jest.fn();
  const mockCostLedgerFindFirst = jest.fn();

  const mockPrisma = {
    landedCostVoucher: {
      update: mockLandedCostVoucherUpdate,
    },
    costLedger: {
      findFirst: mockCostLedgerFindFirst,
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const mockLockingService = {
    lockWarehouseItems: jest.fn(),
    lockWarehouseItemLots: jest.fn(),
  } as unknown as RevaluationLockingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandedCostRevaluationConsumer,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RevaluationLockingService, useValue: mockLockingService },
      ],
    }).compile();

    consumer = module.get<LandedCostRevaluationConsumer>(
      LandedCostRevaluationConsumer,
    );
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should revert status to DRAFT and rethrow error on general transaction failure', async () => {
    const error = new Error('Database connection lost');
    (prisma.$transaction as jest.Mock).mockRejectedValue(error);
    mockLandedCostVoucherUpdate.mockResolvedValue({
      id: 'voucher-1',
      status: 'DRAFT',
    });

    const job = { data: { voucherId: 'voucher-1' } } as Job;

    await expect(consumer.process(job)).rejects.toThrow(
      'Database connection lost',
    );

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(mockCostLedgerFindFirst).not.toHaveBeenCalled();
    expect(mockLandedCostVoucherUpdate).toHaveBeenCalledWith({
      where: { id: 'voucher-1' },
      data: { status: 'DRAFT' },
    });
  });

  it('should mark voucher as POSTED and resolve without rethrowing on duplicate key (P2002) if ledger entries already exist', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('Duplicate key', {
      code: 'P2002',
      clientVersion: '6.9.0',
    });
    (prisma.$transaction as jest.Mock).mockRejectedValue(error);
    mockCostLedgerFindFirst.mockResolvedValue({ id: 'ledger-1' });
    mockLandedCostVoucherUpdate.mockResolvedValue({
      id: 'voucher-1',
      status: 'POSTED',
    });

    const job = { data: { voucherId: 'voucher-1' } } as Job;

    await expect(consumer.process(job)).resolves.not.toThrow();

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(mockCostLedgerFindFirst).toHaveBeenCalledWith({
      where: {
        documentId: 'voucher-1',
        documentType: 'GOODS_RECEIVED_NOTE',
      },
    });
    expect(mockLandedCostVoucherUpdate).toHaveBeenCalledWith({
      where: { id: 'voucher-1' },
      data: { status: 'POSTED', version: { increment: 1 } },
    });
  });

  it('should revert status to DRAFT and rethrow on duplicate key (P2002) if ledger entries do NOT exist', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('Duplicate key', {
      code: 'P2002',
      clientVersion: '6.9.0',
    });
    (prisma.$transaction as jest.Mock).mockRejectedValue(error);
    mockCostLedgerFindFirst.mockResolvedValue(null);
    mockLandedCostVoucherUpdate.mockResolvedValue({
      id: 'voucher-1',
      status: 'DRAFT',
    });

    const job = { data: { voucherId: 'voucher-1' } } as Job;

    await expect(consumer.process(job)).rejects.toThrow(error);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(mockCostLedgerFindFirst).toHaveBeenCalledWith({
      where: {
        documentId: 'voucher-1',
        documentType: 'GOODS_RECEIVED_NOTE',
      },
    });
    expect(mockLandedCostVoucherUpdate).toHaveBeenCalledWith({
      where: { id: 'voucher-1' },
      data: { status: 'DRAFT' },
    });
  });
});
