import { Test, TestingModule } from '@nestjs/testing';
import { KitchenRequestsController } from './kitchen-requests.controller';
import { KitchenRequestsService } from './kitchen-requests.service';
import { PrismaService } from '../../database/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import { ScopeValidationService } from '../../auth/scope-validation.service';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';

describe('KitchenRequestsController', () => {
  const mockScopeValidationService = {
    validateWarehouse: jest.fn(),
    validateAtLeastOneWarehouse: jest.fn(),
  };

  let controller: KitchenRequestsController;

  const mockKrService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    submit: jest.fn(),
    fulfill: jest.fn(),
    cancel: jest.fn(),
  };

  const mockPrismaService = {
    kitchenRequest: {
      findUnique: jest.fn(),
    },
  };
  const mockWorkflowService = {};

  const mockRequest = {
    headers: {},
    ip: '127.0.0.1',
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KitchenRequestsController],
      providers: [
        { provide: KitchenRequestsService, useValue: mockKrService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WorkflowService, useValue: mockWorkflowService },
        {
          provide: ScopeValidationService,
          useValue: mockScopeValidationService,
        },
      ],
    }).compile();

    controller = module.get<KitchenRequestsController>(
      KitchenRequestsController,
    );
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw ForbiddenException for cross-warehouse create', async () => {
      mockScopeValidationService.validateWarehouse.mockRejectedValue(
        new ForbiddenException('Access to this warehouse is not authorized.'),
      );

      await expect(
        controller.create(
          {
            departmentId: 'dept-1',
            warehouseId: 'wh-other',
            items: [{ itemId: 'item-1', quantityRequested: 5 }],
          },
          'user-1',
          Role.WH_KEEPER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should succeed for same-warehouse create', async () => {
      mockScopeValidationService.validateWarehouse.mockResolvedValue(undefined);
      mockKrService.create.mockResolvedValue({
        id: 'kr-1',
        requestNumber: 'KR-001',
        warehouseId: 'wh-1',
        status: 'DRAFT',
        departmentId: 'dept-1',
        items: [],
        createdAt: new Date(),
      });

      const result = await controller.create(
        {
          departmentId: 'dept-1',
          warehouseId: 'wh-1',
          items: [{ itemId: 'item-1', quantityRequested: 5 }],
        },
        'user-1',
        Role.WH_KEEPER,
      );

      expect(result.data).toBeDefined();
      expect(mockKrService.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException for cross-warehouse update', async () => {
      mockPrismaService.kitchenRequest.findUnique.mockResolvedValue({
        warehouseId: 'wh-other',
      });
      mockScopeValidationService.validateWarehouse.mockRejectedValue(
        new ForbiddenException('Access to this warehouse is not authorized.'),
      );

      await expect(
        controller.update(
          'kr-1',
          { version: 1 },
          'user-1',
          Role.WH_KEEPER,
          mockRequest,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should succeed for same-warehouse update', async () => {
      mockPrismaService.kitchenRequest.findUnique.mockResolvedValue({
        warehouseId: 'wh-1',
      });
      mockScopeValidationService.validateWarehouse.mockResolvedValue(undefined);
      mockKrService.update.mockResolvedValue({
        id: 'kr-1',
        requestNumber: 'KR-001',
        version: 2,
        warehouseId: 'wh-1',
        status: 'DRAFT',
        departmentId: 'dept-1',
        items: [],
        createdAt: new Date(),
      });

      const result = await controller.update(
        'kr-1',
        { version: 1, departmentId: 'dept-1' },
        'user-1',
        Role.WH_KEEPER,
        mockRequest,
      );

      expect(result.data).toBeDefined();
      expect(mockKrService.update).toHaveBeenCalledWith(
        'kr-1',
        { version: 1, departmentId: 'dept-1' },
        'user-1',
        '127.0.0.1',
      );
    });
  });
});
