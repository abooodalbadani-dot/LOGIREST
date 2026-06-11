import { Test, TestingModule } from '@nestjs/testing';
import { YieldService } from './yield.service';
import { PrismaService } from '../../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('YieldService', () => {
  let service: YieldService;

  const mockPrisma = {
    yieldBatch: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YieldService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<YieldService>(YieldService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return mapped yield batches', async () => {
      const mockBatches = [
        {
          id: 'yield-1',
          recipeName: 'Beef Stroganoff Prep',
          category: 'protein',
          inputQty: 15.0,
          outputQty: 12.6,
          wasteQty: 2.4,
          yieldPct: 84.0,
          standardYield: 85.0,
          efficiency: 98.8,
          createdAt: new Date('2026-05-29T10:00:00Z'),
          warehouseId: null,
        },
      ];
      mockPrisma.yieldBatch.findMany.mockResolvedValue(mockBatches);

      const result = await service.findAll();

      expect(mockPrisma.yieldBatch.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([
        {
          id: 'yield-1',
          recipeName: 'Beef Stroganoff Prep',
          category: 'protein',
          inputQty: 15.0,
          outputQty: 12.6,
          wasteQty: 2.4,
          yieldPct: 84.0,
          standardYield: 85.0,
          efficiency: 98.8,
          createdAt: '2026-05-29T10:00:00.000Z',
        },
      ]);
    });
  });

  describe('findOne', () => {
    it('should return batch if found', async () => {
      const mockBatch = {
        id: 'yield-1',
        recipeName: 'Beef Stroganoff Prep',
        category: 'protein',
        inputQty: 15.0,
        outputQty: 12.6,
        wasteQty: 2.4,
        yieldPct: 84.0,
        standardYield: 85.0,
        efficiency: 98.8,
        createdAt: new Date('2026-05-29T10:00:00Z'),
        warehouseId: null,
      };
      mockPrisma.yieldBatch.findUnique.mockResolvedValue(mockBatch);

      const result = await service.findOne('yield-1');

      expect(mockPrisma.yieldBatch.findUnique).toHaveBeenCalledWith({
        where: { id: 'yield-1' },
      });
      expect(result).toEqual({
        id: 'yield-1',
        recipeName: 'Beef Stroganoff Prep',
        category: 'protein',
        inputQty: 15.0,
        outputQty: 12.6,
        wasteQty: 2.4,
        yieldPct: 84.0,
        standardYield: 85.0,
        efficiency: 98.8,
        createdAt: '2026-05-29T10:00:00.000Z',
      });
    });

    it('should throw NotFoundException if batch not found', async () => {
      mockPrisma.yieldBatch.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should calculate and persist new yield batch', async () => {
      const createBody = {
        recipeName: 'Tomatoes Prep',
        category: 'produce',
        inputQty: 10.0,
        outputQty: 9.1,
        standardYield: 90.0,
      };

      const mockCreated = {
        id: 'yield-new',
        recipeName: 'Tomatoes Prep',
        category: 'produce',
        inputQty: 10.0,
        outputQty: 9.1,
        wasteQty: 0.9,
        yieldPct: 91.0,
        standardYield: 90.0,
        efficiency: 101.11,
        createdAt: new Date('2026-05-30T10:00:00Z'),
        warehouseId: null,
      };

      mockPrisma.yieldBatch.create.mockResolvedValue(mockCreated);

      const result = await service.create(createBody);

      expect(mockPrisma.yieldBatch.create).toHaveBeenCalledWith({
        data: {
          recipeName: 'Tomatoes Prep',
          category: 'produce',
          inputQty: 10.0,
          outputQty: 9.1,
          wasteQty: 0.9,
          yieldPct: 91.0,
          standardYield: 90.0,
          efficiency: 101.11,
          warehouseId: null,
        },
      });

      expect(result).toEqual({
        id: 'yield-new',
        recipeName: 'Tomatoes Prep',
        category: 'produce',
        inputQty: 10.0,
        outputQty: 9.1,
        wasteQty: 0.9,
        yieldPct: 91.0,
        standardYield: 90.0,
        efficiency: 101.11,
        createdAt: '2026-05-30T10:00:00.000Z',
      });
    });

    it('should throw BadRequestException if required fields are missing', async () => {
      await expect(
        service.create({ recipeName: 'Tomatoes Prep' } as Parameters<
          typeof service.create
        >[0]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if inputQty is less than or equal to zero', async () => {
      await expect(
        service.create({
          recipeName: 'Tomatoes Prep',
          category: 'produce',
          inputQty: 0,
          outputQty: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
