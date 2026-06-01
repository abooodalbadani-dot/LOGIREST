import { Test, TestingModule } from '@nestjs/testing';
import { TransfersController } from './transfers.controller';
import { TransferPostService } from '../transfer-post.service';
import { TransfersService } from './transfers.service';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { ScopeValidationService } from '../../../auth/scope-validation.service';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';

describe('TransfersController', () => {
  const mockScopeValidationService = {
    validateWarehouse: jest.fn(),
    validateAtLeastOneWarehouse: jest.fn(),
  };

  let controller: TransfersController;

  const mockTransferPostService = {
    ship: jest.fn(),
    receive: jest.fn(),
  };

  const mockPrismaService = {};
  const mockWorkflowService = {};

  const mockTransfersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    getSummary: jest.fn(),
    cancel: jest.fn(),
    postToLedger: jest.fn(),
  };

  const mockRequest = {
    headers: {},
    ip: '127.0.0.1',
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransfersController],
      providers: [
        { provide: TransferPostService, useValue: mockTransferPostService },
        { provide: TransfersService, useValue: mockTransfersService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WorkflowService, useValue: mockWorkflowService },
        {
          provide: ScopeValidationService,
          useValue: mockScopeValidationService,
        },
      ],
    }).compile();

    controller = module.get<TransfersController>(TransfersController);
    jest.clearAllMocks();
  });

  describe('ship', () => {
    it('should throw ForbiddenException for cross-warehouse ship', async () => {
      mockTransfersService.findOne.mockResolvedValue({
        id: 'transfer-1',
        fromWarehouseId: 'wh-other',
        toWarehouseId: 'wh-target',
      });
      mockScopeValidationService.validateWarehouse.mockRejectedValue(
        new ForbiddenException('Access to this warehouse is not authorized.'),
      );

      await expect(
        controller.ship(
          'transfer-1',
          'user-1',
          Role.WH_KEEPER,
          { version: 1 },
          mockRequest,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should succeed for valid warehouse ship', async () => {
      mockTransfersService.findOne.mockResolvedValue({
        id: 'transfer-1',
        fromWarehouseId: 'wh-1',
        toWarehouseId: 'wh-2',
      });
      mockScopeValidationService.validateWarehouse.mockResolvedValue(undefined);
      mockTransferPostService.ship.mockResolvedValue({
        id: 'transfer-1',
        status: 'IN_TRANSIT',
      });

      const result = await controller.ship(
        'transfer-1',
        'user-1',
        Role.WH_KEEPER,
        { version: 1 },
        mockRequest,
      );

      expect(result).toBeDefined();
      expect(mockTransferPostService.ship).toHaveBeenCalledWith(
        'transfer-1',
        'user-1',
        Role.WH_KEEPER,
        1,
        '127.0.0.1',
      );
    });
  });

  describe('receive', () => {
    it('should throw ForbiddenException for cross-warehouse receive', async () => {
      mockTransfersService.findOne.mockResolvedValue({
        id: 'transfer-1',
        fromWarehouseId: 'wh-1',
        toWarehouseId: 'wh-other',
      });
      mockScopeValidationService.validateWarehouse.mockRejectedValue(
        new ForbiddenException('Access to this warehouse is not authorized.'),
      );

      await expect(
        controller.receive(
          'transfer-1',
          'user-1',
          Role.WH_KEEPER,
          { version: 1 },
          mockRequest,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancel', () => {
    it('should throw ForbiddenException for cross-warehouse cancel', async () => {
      mockTransfersService.findOne.mockResolvedValue({
        id: 'transfer-1',
        fromWarehouseId: 'wh-other',
        toWarehouseId: 'wh-2',
      });
      mockScopeValidationService.validateWarehouse.mockRejectedValue(
        new ForbiddenException('Access to this warehouse is not authorized.'),
      );

      await expect(
        controller.cancel(
          'transfer-1',
          'user-1',
          Role.WH_KEEPER,
          { version: 1 },
          mockRequest,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
