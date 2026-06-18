import { Test, TestingModule } from '@nestjs/testing';
import { StocktakeService } from './stocktake.service';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('StocktakeService', () => {
  let service: StocktakeService;
  let prisma: PrismaService;
  let workflowService: WorkflowService;

  const mockStocktakeSessionCreate = jest.fn();
  const mockStocktakeSessionFindUnique = jest.fn();
  const mockStocktakeSessionUpdate = jest.fn();
  const mockWarehouseUpdate = jest.fn();
  const mockWarehouseLockCreate = jest.fn();
  const mockWarehouseLockUpdateMany = jest.fn();
  const mockWarehouseItemFindMany = jest.fn();
  const mockWarehouseItemLotFindMany = jest.fn();
  const mockStocktakeSnapshotCreateMany = jest.fn();
  const mockStocktakeCountFindFirst = jest.fn();
  const mockStocktakeCountCreate = jest.fn();
  const mockStocktakeCountUpdate = jest.fn();
  const mockStocktakeCountUpsert = jest.fn();

  const mockPrisma = {
    stocktakeSession: {
      create: mockStocktakeSessionCreate,
      findUnique: mockStocktakeSessionFindUnique,
      update: mockStocktakeSessionUpdate,
    },
    warehouse: {
      update: mockWarehouseUpdate,
    },
    warehouseLock: {
      create: mockWarehouseLockCreate,
      updateMany: mockWarehouseLockUpdateMany,
    },
    warehouseItem: {
      findMany: mockWarehouseItemFindMany,
    },
    warehouseItemLot: {
      findMany: mockWarehouseItemLotFindMany,
    },
    stocktakeSnapshot: {
      createMany: mockStocktakeSnapshotCreateMany,
    },
    stocktakeCount: {
      findFirst: mockStocktakeCountFindFirst,
      create: mockStocktakeCountCreate,
      update: mockStocktakeCountUpdate,
      upsert: mockStocktakeCountUpsert,
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  } as unknown as PrismaService;

  const mockWorkflowService = {
    executeTransition: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StocktakeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WorkflowService, useValue: mockWorkflowService },
      ],
    }).compile();

    service = module.get<StocktakeService>(StocktakeService);
    prisma = module.get<PrismaService>(PrismaService);
    workflowService = module.get<WorkflowService>(WorkflowService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create session', async () => {
      mockStocktakeSessionCreate.mockResolvedValue({ id: 's-1' });

      const result = await service.create({ warehouseId: 'wh-1' }, 'user-1');
      expect(result).toEqual({ id: 's-1' });
    });
  });

  describe('start', () => {
    const userId = 'user-1';
    const role = 'WH_KEEPER' as Role;

    it('should throw NotFoundException if session does not exist', async () => {
      mockStocktakeSessionFindUnique.mockResolvedValue(null);

      await expect(service.start('s-1', userId, role, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if not DRAFT status', async () => {
      mockStocktakeSessionFindUnique.mockResolvedValue({
        id: 's-1',
        status: 'STARTED',
      });

      await expect(service.start('s-1', userId, role, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should lock warehouse, write snapshot, and execute transition', async () => {
      mockStocktakeSessionFindUnique.mockResolvedValue({
        id: 's-1',
        status: 'DRAFT',
        warehouseId: 'wh-1',
      });
      mockWarehouseItemFindMany.mockResolvedValue([
        {
          itemId: 'item-1',
          qtyOnHand: 10,
          wac: 5,
          item: { isBatched: false, hasExpiry: false },
        },
      ]);
      mockWarehouseItemLotFindMany.mockResolvedValue([]);
      mockWorkflowService.executeTransition.mockResolvedValue({
        id: 's-1',
        status: 'STARTED',
      });

      const result = await service.start('s-1', userId, role, {
        version: 1,
        comments: 'start',
      });
      expect(result).toEqual({ id: 's-1', status: 'STARTED' });
      expect(mockWarehouseUpdate).toHaveBeenCalledWith({
        where: { id: 'wh-1' },
        data: { isLocked: true },
      });
      expect(mockStocktakeSnapshotCreateMany).toHaveBeenCalled();
    });
  });

  describe('count', () => {
    it('should throw NotFoundException if session does not exist', async () => {
      mockStocktakeSessionFindUnique.mockResolvedValue(null);

      await expect(service.count('s-1', [], 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if session is not in STARTED or COUNTING status', async () => {
      mockStocktakeSessionFindUnique.mockResolvedValue({
        id: 's-1',
        status: 'DRAFT',
      });

      await expect(service.count('s-1', [], 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create new count if none exists', async () => {
      mockStocktakeSessionFindUnique.mockResolvedValue({
        id: 's-1',
        status: 'STARTED',
      });
      mockStocktakeCountFindFirst.mockResolvedValue(null);

      const result = await service.count(
        's-1',
        [{ itemId: 'item-1', qtyCounted: 12 }],
        'user-1',
      );
      expect(result).toEqual({ success: true });
      expect(mockStocktakeCountUpsert).toHaveBeenCalled();
      expect(mockStocktakeSessionUpdate).toHaveBeenCalledWith({
        where: { id: 's-1' },
        data: { status: 'COUNTING' },
      });
    });
  });

  describe('cancel', () => {
    it('should unlock warehouse and transition session to cancelled', async () => {
      mockStocktakeSessionFindUnique.mockResolvedValue({
        id: 's-1',
        status: 'STARTED',
        warehouseId: 'wh-1',
      });
      mockWorkflowService.executeTransition.mockResolvedValue({
        id: 's-1',
        status: 'CANCELLED',
      });

      const result = await service.cancel('s-1', 'user-1', 'WH_KEEPER', {});
      expect(result).toEqual({ id: 's-1', status: 'CANCELLED' });
      expect(mockWarehouseUpdate).toHaveBeenCalledWith({
        where: { id: 'wh-1' },
        data: { isLocked: false },
      });
      expect(mockWarehouseLockUpdateMany).toHaveBeenCalledWith({
        where: { warehouseId: 'wh-1', isActive: true },
        data: { isActive: false },
      });
    });
  });
});
