import { Test, TestingModule } from '@nestjs/testing';
import { WarehousesController } from './warehouses.controller';
import { PrismaService } from '../../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';

describe('WarehousesController', () => {
  let controller: WarehousesController;

  const mockPrismaService = {
    warehouse: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    warehouseItem: {
      aggregate: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockRequest = {
    headers: {},
    ip: '127.0.0.1',
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WarehousesController],
      providers: [{ provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    controller = module.get<WarehousesController>(WarehousesController);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should query active warehouses by default', async () => {
      mockPrismaService.warehouse.findMany.mockResolvedValue([]);

      await controller.findAll();
      expect(mockPrismaService.warehouse.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: { branch: true },
        orderBy: { name: 'asc' },
      });
    });

    it('should query all warehouses if includeArchived is true', async () => {
      mockPrismaService.warehouse.findMany.mockResolvedValue([]);

      await controller.findAll('true');
      expect(mockPrismaService.warehouse.findMany).toHaveBeenCalledWith({
        where: {},
        include: { branch: true },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return warehouse if found', async () => {
      const mockWarehouse = { id: 'wh-1', name: 'WH 1' };
      mockPrismaService.warehouse.findUnique.mockResolvedValue(mockWarehouse);

      const result = await controller.findOne('wh-1');
      expect(result).toEqual(mockWarehouse);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.warehouse.findUnique.mockResolvedValue(null);

      await expect(controller.findOne('wh-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('archive', () => {
    it('should throw NotFoundException if warehouse does not exist', async () => {
      mockPrismaService.warehouse.findUnique.mockResolvedValue(null);

      await expect(
        controller.archive('wh-1', 'user-1', mockRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if warehouse is already archived', async () => {
      mockPrismaService.warehouse.findUnique.mockResolvedValue({
        id: 'wh-1',
        isActive: false,
      });

      await expect(
        controller.archive('wh-1', 'user-1', mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if warehouse has active inventory', async () => {
      mockPrismaService.warehouse.findUnique.mockResolvedValue({
        id: 'wh-1',
        isActive: true,
      });
      mockPrismaService.warehouseItem.aggregate.mockResolvedValue({
        _sum: { qtyOnHand: 15 },
      });

      await expect(
        controller.archive('wh-1', 'user-1', mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should archive warehouse if inventory is zero', async () => {
      const mockWarehouse = { id: 'wh-1', isActive: true, version: 1 };
      mockPrismaService.warehouse.findUnique.mockResolvedValue(mockWarehouse);
      mockPrismaService.warehouseItem.aggregate.mockResolvedValue({
        _sum: { qtyOnHand: 0 },
      });

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });

      mockPrismaService.warehouse.update.mockResolvedValue({
        id: 'wh-1',
        isActive: false,
        version: 2,
      });

      const result = await controller.archive('wh-1', 'user-1', mockRequest);
      expect(result).toEqual({ id: 'wh-1', isActive: false, version: 2 });
      expect(mockPrismaService.warehouse.update).toHaveBeenCalledWith({
        where: { id: 'wh-1' },
        data: { isActive: false, version: 2 },
      });
    });
  });
});
