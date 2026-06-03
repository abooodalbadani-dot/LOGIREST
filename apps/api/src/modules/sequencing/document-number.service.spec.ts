import { Test, TestingModule } from '@nestjs/testing';
import { DocumentNumberService } from './document-number.service';
import { Prisma } from '@prisma/client';

describe('DocumentNumberService', () => {
  let service: DocumentNumberService;

  const mockQueryRaw = jest.fn();

  const mockPrismaTx = {
    $queryRaw: mockQueryRaw,
  } as unknown as Prisma.TransactionClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentNumberService],
    }).compile();

    service = module.get<DocumentNumberService>(DocumentNumberService);
    jest.clearAllMocks();
  });

  it('should generate the next sequence number and format the date key correctly', async () => {
    // Mock the raw SQL query to return a sequence number and a Date object
    const mockDate = new Date(Date.UTC(2026, 5, 3)); // 2026-06-03 UTC
    mockQueryRaw.mockResolvedValue([
      {
        last_seq: 42,
        date_key: mockDate,
      },
    ]);

    const result = await service.next(
      mockPrismaTx,
      'LANDED_COST_VOUCHER',
      'LCV',
    );

    expect(result).toBe('LCV-20260603-0042');
    expect(mockQueryRaw).toHaveBeenCalled();

    // Verify the query parameters
    const sqlCall = mockQueryRaw.mock.calls[0];
    expect(sqlCall).toBeDefined();
  });

  it('should throw an error if the raw query execution returns empty list', async () => {
    mockQueryRaw.mockResolvedValue([]);

    await expect(
      service.next(mockPrismaTx, 'LANDED_COST_VOUCHER', 'LCV'),
    ).rejects.toThrow('Failed to generate sequence for LANDED_COST_VOUCHER');
  });

  it('should handle single digit days and months correctly by padding with zeroes', async () => {
    const mockDateSingleDigits = new Date(Date.UTC(2026, 0, 5)); // 2026-01-05 UTC
    mockQueryRaw.mockResolvedValue([
      {
        last_seq: 1,
        date_key: mockDateSingleDigits,
      },
    ]);

    const result = await service.next(mockPrismaTx, 'TEST_TYPE', 'TST');

    expect(result).toBe('TST-20260105-0001');
  });
});
