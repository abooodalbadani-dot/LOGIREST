import { Test, TestingModule } from '@nestjs/testing';
import { AdjustmentsController } from './adjustments.controller';
import { AdjustmentsService } from './adjustments.service';
import { AdjustmentPostService } from '../adjustment-post.service';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { ScopeValidationService } from '../../../auth/scope-validation.service';
import { PdfGeneratorService } from '../../pdf/pdf-generator.service';
import { ForbiddenException } from '@nestjs/common';
import { Role, AdjustmentDirection, AdjustmentReason } from '@prisma/client';
import type { Request } from 'express';

describe('AdjustmentsController', () => {
  const mockScopeValidationService = {
    validateWarehouse: jest.fn(),
    validateAtLeastOneWarehouse: jest.fn(),
  };

  let controller: AdjustmentsController;

  const mockAdjPostService = {
    post: jest.fn(),
  };

  const mockPdfGeneratorService = {};

  const mockPrismaService = {
    adjustment: {
      findUnique: jest.fn(),
    },
  };
  const mockWorkflowService = {};

  const mockAdjustmentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    getSummary: jest.fn(),
    update: jest.fn(),
    edit: jest.fn(),
    submit: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    cancel: jest.fn(),
  };

  const mockRequest = {
    headers: {},
    ip: '127.0.0.1',
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdjustmentsController],
      providers: [
        { provide: AdjustmentPostService, useValue: mockAdjPostService },
        { provide: AdjustmentsService, useValue: mockAdjustmentsService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WorkflowService, useValue: mockWorkflowService },
        { provide: PdfGeneratorService, useValue: mockPdfGeneratorService },
        {
          provide: ScopeValidationService,
          useValue: mockScopeValidationService,
        },
      ],
    }).compile();

    controller = module.get<AdjustmentsController>(AdjustmentsController);
    mockScopeValidationService.validateWarehouse.mockReset();
    mockScopeValidationService.validateWarehouse.mockResolvedValue(undefined);
    mockPrismaService.adjustment.findUnique.mockReset();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw ForbiddenException for cross-warehouse creation', async () => {
      mockScopeValidationService.validateWarehouse.mockRejectedValue(
        new ForbiddenException('Access to this warehouse is not authorized.'),
      );

      await expect(
        controller.create(
          {
            warehouseId: 'wh-other',
            lines: [
              {
                itemId: 'item-1',
                quantity: 10,
                direction: AdjustmentDirection.IN,
                reason: AdjustmentReason.CORRECTION,
              },
            ],
          },
          'user-1',
          Role.WH_KEEPER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should succeed for same-warehouse creation', async () => {
      mockScopeValidationService.validateWarehouse.mockResolvedValue(undefined);
      mockAdjustmentsService.create.mockResolvedValue({
        id: 'adj-1',
        adjustmentNumber: 'ADJ-001',
        warehouseId: 'wh-1',
        status: 'DRAFT',
        lines: [],
        createdAt: new Date(),
      });

      const result = await controller.create(
        {
          warehouseId: 'wh-1',
          lines: [
            {
              itemId: 'item-1',
              quantity: 10,
              direction: AdjustmentDirection.IN,
              reason: AdjustmentReason.CORRECTION,
            },
          ],
        },
        'user-1',
        Role.WH_KEEPER,
      );

      expect(result).toBeDefined();
      expect(mockAdjustmentsService.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException for cross-warehouse update', async () => {
      mockPrismaService.adjustment.findUnique.mockResolvedValue({
        warehouseId: 'wh-other',
      });
      mockScopeValidationService.validateWarehouse.mockRejectedValue(
        new ForbiddenException('Access to this warehouse is not authorized.'),
      );

      await expect(
        controller.update('adj-1', 'user-1', Role.WH_KEEPER, { version: 1 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should succeed for same-warehouse update', async () => {
      mockPrismaService.adjustment.findUnique.mockResolvedValue({
        warehouseId: 'wh-1',
      });
      mockScopeValidationService.validateWarehouse.mockResolvedValue(undefined);
      mockAdjustmentsService.update.mockResolvedValue({
        id: 'adj-1',
        adjustmentNumber: 'ADJ-001',
        version: 2,
        warehouseId: 'wh-1',
        lines: [],
        createdAt: new Date(),
      });

      const result = await controller.update('adj-1', 'user-1', Role.ADMIN, {
        version: 1,
        warehouseId: 'wh-1',
        reason: 'CORRECTION',
      });

      expect(result).toBeDefined();
      expect(mockAdjustmentsService.update).toHaveBeenCalledWith('adj-1', {
        version: 1,
        warehouseId: 'wh-1',
        reason: 'CORRECTION',
        notes: undefined,
        lines: undefined,
      });
    });
  });
});
