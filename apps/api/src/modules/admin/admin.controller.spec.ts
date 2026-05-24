import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { PrismaService } from '../../database/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('AdminController', () => {
  let controller: AdminController;

  const mockPrismaService = {
    reconciliationRun: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    jest.clearAllMocks();
  });

  it('should throw ForbiddenException if user role is not ADMIN', async () => {
    await expect(
      controller.getReconciliationRuns(Role.INV_MGR, '1', '50'),
    ).rejects.toThrow(ForbiddenException);

    expect(mockPrismaService.reconciliationRun.findMany).not.toHaveBeenCalled();
  });

  it('should return paginated reconciliation runs for ADMIN', async () => {
    const mockRun = {
      id: 'run-1',
      ranAt: new Date(),
      itemsChecked: 10,
      discrepanciesFound: 1,
      frozenItems: ['SKU1'],
      durationMs: 150,
    };

    mockPrismaService.reconciliationRun.count.mockResolvedValue(1);
    mockPrismaService.reconciliationRun.findMany.mockResolvedValue([mockRun]);

    const result = await controller.getReconciliationRuns(
      Role.ADMIN,
      '1',
      '50',
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual(mockRun);
    expect(result.meta).toEqual({
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
  });
});
