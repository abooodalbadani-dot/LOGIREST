import { Test, TestingModule } from '@nestjs/testing';
import { DocumentNumberService } from './document-number.service';
import { Prisma } from '@prisma/client';

describe('DocumentNumberService', () => {
  let service: DocumentNumberService;

  const mockQueryRaw = jest.fn();
  const mockBranchFindUnique = jest.fn();

  const mockPrismaTx = {
    $queryRaw: mockQueryRaw,
    branch: {
      findUnique: mockBranchFindUnique,
    },
  } as unknown as Prisma.TransactionClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentNumberService],
    }).compile();

    service = module.get<DocumentNumberService>(DocumentNumberService);
    jest.clearAllMocks();
  });

  it('should generate the next sequence number and format it with current year and branch code', async () => {
    mockBranchFindUnique.mockResolvedValue({ code: 'BR01' });
    mockQueryRaw.mockResolvedValue([
      {
        last_seq: 42,
      },
    ]);

    const result = await service.next(
      mockPrismaTx,
      'LANDED_COST_VOUCHER',
      'branch-1',
    );

    const currentYear = new Date().getFullYear();
    expect(result).toBe(`LCV-${currentYear}-BR01-00042`);
    expect(mockBranchFindUnique).toHaveBeenCalledWith({
      where: { id: 'branch-1' },
      select: { code: true },
    });
    expect(mockQueryRaw).toHaveBeenCalled();
  });

  it('should throw an error if the raw query execution returns empty list', async () => {
    mockBranchFindUnique.mockResolvedValue({ code: 'BR01' });
    mockQueryRaw.mockResolvedValue([]);

    await expect(
      service.next(mockPrismaTx, 'LANDED_COST_VOUCHER', 'branch-1'),
    ).rejects.toThrow('Failed to generate sequence for LANDED_COST_VOUCHER');
  });

  it('should pad the sequence number with zeroes to 5 digits', async () => {
    mockBranchFindUnique.mockResolvedValue({ code: 'BR02' });
    mockQueryRaw.mockResolvedValue([
      {
        last_seq: 7,
      },
    ]);

    const result = await service.next(mockPrismaTx, 'TEST_TYPE', 'branch-2');

    const currentYear = new Date().getFullYear();
    expect(result).toBe(`TEST_TYPE-${currentYear}-BR02-00007`);
  });

  it('should throw an error if the branch is not found', async () => {
    mockBranchFindUnique.mockResolvedValue(null);

    await expect(
      service.next(mockPrismaTx, 'TEST_TYPE', 'non-existent-branch'),
    ).rejects.toThrow('Branch with ID non-existent-branch not found');
  });
});
