import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyService } from './idempotency.service';
import { PrismaService } from '../database/prisma.service';

describe('IdempotencyService', () => {
  let service: IdempotencyService;

  const mockPrisma = {
    idempotencyLog: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should call findUnique on getLog', async () => {
    mockPrisma.idempotencyLog.findUnique.mockResolvedValue({ key: 'key-1' });
    const result = await service.getLog('key-1');
    expect(mockPrisma.idempotencyLog.findUnique).toHaveBeenCalledWith({
      where: { key: 'key-1' },
    });
    expect(result).toEqual({ key: 'key-1' });
  });

  it('should call create on createPendingLog', async () => {
    mockPrisma.idempotencyLog.create.mockResolvedValue({
      key: 'key-1',
      statusCode: 102,
    });
    const result = await service.createPendingLog('key-1');
    expect(mockPrisma.idempotencyLog.create).toHaveBeenCalledWith({
      data: {
        key: 'key-1',
        responseBody: '{}',
        statusCode: 102,
      },
    });
    expect(result).toEqual({ key: 'key-1', statusCode: 102 });
  });

  it('should call update on updateLog', async () => {
    mockPrisma.idempotencyLog.update.mockResolvedValue({
      key: 'key-1',
      statusCode: 200,
    });
    const result = await service.updateLog('key-1', 200, '{"data":"ok"}');
    expect(mockPrisma.idempotencyLog.update).toHaveBeenCalledWith({
      where: { key: 'key-1' },
      data: {
        statusCode: 200,
        responseBody: '{"data":"ok"}',
      },
    });
    expect(result).toEqual({ key: 'key-1', statusCode: 200 });
  });

  it('should call delete on deleteLog', async () => {
    mockPrisma.idempotencyLog.delete.mockResolvedValue({ key: 'key-1' });
    const result = await service.deleteLog('key-1');
    expect(mockPrisma.idempotencyLog.delete).toHaveBeenCalledWith({
      where: { key: 'key-1' },
    });
    expect(result).toEqual({ key: 'key-1' });
  });

  it('should call deleteMany on pruneExpiredLogs', async () => {
    mockPrisma.idempotencyLog.deleteMany.mockResolvedValue({ count: 5 });
    await service.pruneExpiredLogs();
    expect(mockPrisma.idempotencyLog.deleteMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          lt: expect.any(Date),
        },
      },
    });
  });
});
