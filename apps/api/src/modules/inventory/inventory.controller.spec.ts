import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController, ItemsController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('Inventory Controllers', () => {
  let inventoryController: InventoryController;
  let itemsController: ItemsController;

  const mockInventoryService = {
    getBalance: jest.fn(),
    getLots: jest.fn(),
    getMovements: jest.fn(),
    scanBarcode: jest.fn(),
    unfreeze: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController, ItemsController],
      providers: [
        { provide: InventoryService, useValue: mockInventoryService },
      ],
    }).compile();

    inventoryController = module.get<InventoryController>(InventoryController);
    itemsController = module.get<ItemsController>(ItemsController);
    jest.clearAllMocks();
  });

  describe('InventoryController', () => {
    it('should call getBalance on InventoryService', async () => {
      const mockResult = [{ itemId: 'item-1', onHandQty: 10 }];
      mockInventoryService.getBalance.mockResolvedValue(mockResult);

      const query = { itemId: 'item-1', page: 1, limit: 50 };
      const result = await inventoryController.getBalance('wh-1', query);

      expect(result).toBe(mockResult);
      expect(mockInventoryService.getBalance).toHaveBeenCalledWith(
        'wh-1',
        query,
      );
    });

    it('should call getLots on InventoryService', async () => {
      const mockResult = [{ lotId: 'lot-1', onHandQty: 5 }];
      mockInventoryService.getLots.mockResolvedValue(mockResult);

      const query = {
        itemId: 'item-1',
        status: 'ACTIVE' as const,
        page: 1,
        limit: 50,
      };
      const result = await inventoryController.getLots('wh-1', query);

      expect(result).toBe(mockResult);
      expect(mockInventoryService.getLots).toHaveBeenCalledWith('wh-1', query);
    });

    it('should call getMovements on InventoryService', async () => {
      const mockResult = { data: [], meta: { total: 0 } };
      mockInventoryService.getMovements.mockResolvedValue(mockResult);

      const query = { page: 1, limit: 50 };
      const result = await inventoryController.getMovements('wh-1', query);

      expect(result).toBe(mockResult);
      expect(mockInventoryService.getMovements).toHaveBeenCalledWith(
        'wh-1',
        query,
      );
    });

    describe('unfreeze', () => {
      it('should throw BadRequestException if reason is missing or empty', async () => {
        await expect(
          inventoryController.unfreeze(
            'item-1',
            'wh-1',
            'user-1',
            ' ',
            '127.0.0.1',
          ),
        ).rejects.toThrow(BadRequestException);

        expect(mockInventoryService.unfreeze).not.toHaveBeenCalled();
      });

      it('should call unfreeze on InventoryService if authorized', async () => {
        const mockResult = {
          warehouseId: 'wh-1',
          itemId: 'item-1',
          isFrozen: false,
        };
        mockInventoryService.unfreeze.mockResolvedValue(mockResult);

        const result = await inventoryController.unfreeze(
          'item-1',
          'wh-1',
          'user-1',
          'Reconciliation ok',
          '127.0.0.1',
        );

        expect(result).toBe(mockResult);
        expect(mockInventoryService.unfreeze).toHaveBeenCalledWith(
          'item-1',
          'wh-1',
          'user-1',
          'Reconciliation ok',
          '127.0.0.1',
        );
      });
    });
  });

  describe('ItemsController', () => {
    it('should call scanBarcode on InventoryService', async () => {
      const mockResult = { itemId: 'item-1', uomSymbol: 'kg', activeLots: [] };
      mockInventoryService.scanBarcode.mockResolvedValue(mockResult);

      const result = await itemsController.scanBarcode('wh-1', '9780201379624');

      expect(result).toBe(mockResult);
      expect(mockInventoryService.scanBarcode).toHaveBeenCalledWith(
        'wh-1',
        '9780201379624',
      );
    });
  });
});
