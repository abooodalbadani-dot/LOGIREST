import { Test, TestingModule } from '@nestjs/testing';
import { LandedCostService } from './landed-cost.service';
import { PrismaService } from '../../../database/prisma.service';
import { DocumentNumberService } from '../../sequencing/document-number.service';
import { Role } from '@prisma/client';

describe('LandedCostService', () => {
  let service: LandedCostService;
  let mockDocumentNumberService: { next: jest.Mock };

  const mockTx = {
    goodsReceivedNote: {
      findUnique: jest.fn(),
    },
    userWarehouseScope: {
      findUnique: jest.fn(),
    },
    landedCostVoucher: {
      create: jest.fn(),
    },
  };

  const mockPrisma = {
    $transaction: jest.fn().mockImplementation((cb) => cb(mockTx)),
  };

  beforeEach(async () => {
    mockDocumentNumberService = {
      next: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandedCostService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DocumentNumberService, useValue: mockDocumentNumberService },
      ],
    }).compile();

    service = module.get<LandedCostService>(LandedCostService);
    jest.clearAllMocks();
  });

  it('should create landed cost voucher and generate sequence number using DocumentNumberService', async () => {
    mockDocumentNumberService.next.mockResolvedValue('LCV-20260603-0001');
    mockTx.goodsReceivedNote.findUnique.mockResolvedValue({
      id: 'grn-1',
      warehouseId: 'wh-1',
    });
    mockTx.userWarehouseScope.findUnique.mockResolvedValue({ id: 'scope-1' });
    mockTx.landedCostVoucher.create.mockResolvedValue({
      id: 'voucher-1',
      voucherNumber: 'LCV-20260603-0001',
    });

    const result = await service.create({
      allocationMethod: 'VALUE',
      totalAllocatedCost: 100.0,
      currencyId: 'USD',
      exchangeRate: 1.0,
      transactionDate: '2026-06-03T00:00:00.000Z',
      grnIds: ['grn-1'],
      createdById: 'user-1',
      userRole: Role.INV_MGR,
    });

    expect(result.voucherNumber).toBe('LCV-20260603-0001');
    expect(mockDocumentNumberService.next).toHaveBeenCalledWith(
      mockTx,
      'LANDED_COST_VOUCHER',
      'LCV',
    );
    expect(mockTx.landedCostVoucher.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          voucherNumber: 'LCV-20260603-0001',
        }),
      }),
    );
  });
});
