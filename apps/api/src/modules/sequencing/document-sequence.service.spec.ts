import { Test, TestingModule } from '@nestjs/testing';
import { DocumentSequenceService } from './document-sequence.service';
import { PrismaService } from '../../database/prisma.service';
import { DocumentType, Prisma } from '@prisma/client';

describe('DocumentSequenceService', () => {
  let service: DocumentSequenceService;

  const mockBranchFindUnique = jest.fn();
  const mockDocumentSequenceCreate = jest.fn();
  const mockDocumentSequenceUpdate = jest.fn();
  const mockQueryRaw = jest.fn();

  const mockPrismaTx = {
    branch: {
      findUnique: mockBranchFindUnique,
    },
    documentSequence: {
      create: mockDocumentSequenceCreate,
      update: mockDocumentSequenceUpdate,
    },
    $queryRaw: mockQueryRaw,
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
        DocumentSequenceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DocumentSequenceService>(DocumentSequenceService);
    jest.clearAllMocks();
  });

  it('should generate document sequence with correct format and increment sequence', async () => {
    const branchId = 'branch-hq';
    const currentYear = new Date().getFullYear();

    mockBranchFindUnique.mockResolvedValue({ code: 'HQ' });
    mockQueryRaw.mockResolvedValue([{ id: 'seq-1', current_sequence: 5 }]);
    mockDocumentSequenceUpdate.mockResolvedValue({
      id: 'seq-1',
      currentSequence: 6,
    });

    const result = await service.generateNext(
      mockPrismaTx,
      DocumentType.PURCHASE_ORDER,
      branchId,
    );

    expect(result).toBe(`PO-${currentYear}-HQ-00006`);
    expect(mockBranchFindUnique).toHaveBeenCalledWith({
      where: { id: branchId },
      select: { code: true },
    });
    expect(mockQueryRaw).toHaveBeenCalled();
    // Verify SELECT FOR UPDATE was used in the raw query
    const rawSqlCall = mockQueryRaw.mock.calls[0][0].join(' ');
    expect(rawSqlCall).toContain('FOR UPDATE');
    expect(mockDocumentSequenceUpdate).toHaveBeenCalledWith({
      where: { id: 'seq-1' },
      data: { currentSequence: { increment: 1 } },
    });
  });

  it('should initialize and reset sequence to 00001 if sequence does not exist for the current year', async () => {
    const branchId = 'branch-hq';
    const currentYear = new Date().getFullYear();

    mockBranchFindUnique.mockResolvedValue({ code: 'HQ' });
    mockQueryRaw.mockResolvedValue([]); // no sequence found
    mockDocumentSequenceCreate.mockResolvedValue({
      id: 'seq-new',
      currentSequence: 1,
    });

    const result = await service.generateNext(
      mockPrismaTx,
      DocumentType.PURCHASE_ORDER,
      branchId,
    );

    expect(result).toBe(`PO-${currentYear}-HQ-00001`);
    expect(mockDocumentSequenceCreate).toHaveBeenCalledWith({
      data: {
        branchId,
        documentType: DocumentType.PURCHASE_ORDER,
        year: currentYear,
        currentSequence: 1,
        prefix: `PO-${currentYear}-HQ`,
      },
    });
  });

  it('should retry and increment if creation fails due to concurrent insert (race condition)', async () => {
    const branchId = 'branch-hq';
    const currentYear = new Date().getFullYear();

    mockBranchFindUnique.mockResolvedValue({ code: 'HQ' });
    
    // First query returns empty (no sequence found)
    // Second query (retry) returns the concurrently created row
    mockQueryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'seq-concurrent', current_sequence: 1 }]);

    // Creation throws error due to concurrent insert (unique constraint violation)
    mockDocumentSequenceCreate.mockRejectedValue(new Error('PrismaClientKnownRequestError: Unique constraint failed'));

    mockDocumentSequenceUpdate.mockResolvedValue({
      id: 'seq-concurrent',
      currentSequence: 2,
    });

    const result = await service.generateNext(
      mockPrismaTx,
      DocumentType.PURCHASE_ORDER,
      branchId,
    );

    expect(result).toBe(`PO-${currentYear}-HQ-00002`);
    expect(mockDocumentSequenceCreate).toHaveBeenCalled();
    expect(mockQueryRaw).toHaveBeenCalledTimes(2);
    expect(mockDocumentSequenceUpdate).toHaveBeenCalledWith({
      where: { id: 'seq-concurrent' },
      data: { currentSequence: { increment: 1 } },
    });
  });
});
