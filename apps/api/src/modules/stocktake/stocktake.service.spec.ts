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

  const mockPrisma = {
    stocktakeSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    warehouse: {
      update: jest.fn(),
    },
    warehouseLock: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    warehouseItem: {
      findMany: jest.fn(),
    },
    warehouseItemLot: {
      findMany: jest.fn(),
    },
    stocktakeSnapshot: {
      createMany: jest.fn(),
    },
    stocktakeCount: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

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
      mockPrisma.stocktakeSession.create.mockResolvedValue({ id: 's-1' });

      const result = await service.create({ warehouseId: 'wh-1' }, 'user-1');
      expect(result).toEqual({ id: 's-1' });
    });
  });

  describe('start', () => {
    const userId = 'user-1';
    const role = 'WH_KEEPER' as Role;

    it('should throw NotFoundException if session does not exist', async () => {
      mockPrisma.stocktakeSession.findUnique.mockResolvedValue(null);

      await expect(service.start('s-1', userId, role, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if not DRAFT status', async () => {
      mockPrisma.stocktakeSession.findUnique.mockResolvedValue({
        id: 's-1',
        status: 'STARTED',
      });

      await expect(service.start('s-1', userId, role, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should lock warehouse, write snapshot, and execute transition', async () => {
      mockPrisma.stocktakeSession.findUnique.mockResolvedValue({
        id: 's-1',
        status: 'DRAFT',
        warehouseId: 'wh-1',
      });
      mockPrisma.warehouseItem.findMany.mockResolvedValue([
        {
          itemId: 'item-1',
          qtyOnHand: 10,
          wac: 5,
          item: { isBatched: false, hasExpiry: false },
        },
      ]);
      mockPrisma.warehouseItemLot.findMany.mockResolvedValue([]);
      mockWorkflowService.executeTransition.mockResolvedValue({
        id: 's-1',
        status: 'STARTED',
      });

      const result = await service.start('s-1', userId, role, {
        version: 1,
        comments: 'start',
      });
      expect(result).toEqual({ id: 's-1', status: 'STARTED' });
      expect(mockPrisma.warehouse.update).toHaveBeenCalledWith({
        where: { id: 'wh-1' },
        data: { isLocked: true },
      });
      expect(mockPrisma.stocktakeSnapshot.createMany).toHaveBeenCalled();
    });
  });

  describe('count', () => {
    it('should throw NotFoundException if session does not exist', async () => {
      mockPrisma.stocktakeSession.findUnique.mockResolvedValue(null);

      await expect(service.count('s-1', [], 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if session is not in STARTED or COUNTING status', async () => {
      mockPrisma.stocktakeSession.findUnique.mockResolvedValue({
        id: 's-1',
        status: 'DRAFT',
      });

      await expect(service.count('s-1', [], 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create new count if none exists', async () => {
      mockPrisma.stocktakeSession.findUnique.mockResolvedValue({
        id: 's-1',
        status: 'STARTED',
      });
      mockPrisma.stocktakeCount.findFirst.mockResolvedValue(null);

      const result = await service.count(
        's-1',
        [{ itemId: 'item-1', qtyCounted: 12 }],
        'user-1',
      );
      expect(result).toEqual({ success: true });
      expect(mockPrisma.stocktakeCount.create).toHaveBeenCalled();
      expect(mockPrisma.stocktakeSession.update).toHaveBeenCalledWith({
        where: { id: 's-1' },
        data: { status: 'COUNTING' },
      });
    });
  });

  describe('cancel', () => {
    it('should unlock warehouse and transition session to cancelled', async () => {
      mockPrisma.stocktakeSession.findUnique.mockResolvedValue({
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
      expect(mockPrisma.warehouse.update).toHaveBeenCalledWith({
        where: { id: 'wh-1' },
        data: { isLocked: false },
      });
      expect(mockPrisma.warehouseLock.updateMany).toHaveBeenCalledWith({
        where: { warehouseId: 'wh-1', isActive: true },
        data: { isActive: false },
      });
    });
  });
});
