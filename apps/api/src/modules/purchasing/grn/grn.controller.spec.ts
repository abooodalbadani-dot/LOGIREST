import { Test, TestingModule } from '@nestjs/testing';
import { GrnController } from './grn.controller';
import { GrnService } from './grn.service';
import { GrnPostService } from '../grn-post.service';
import { PrismaService } from '../../../database/prisma.service';
import { WorkflowService } from '../../workflow/workflow.service';
import { ScopeValidationService } from '../../../auth/scope-validation.service';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';

describe('GrnController', () => {
  const mockScopeValidationService = {
    validateWarehouse: jest.fn(),
    validateAtLeastOneWarehouse: jest.fn(),
  };

  let controller: GrnController;

  const mockGrnService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    cancel: jest.fn(),
  };

  const mockGrnPostService = {
    post: jest.fn(),
  };

  const mockPrismaService = {};
  const mockWorkflowService = {};

  const mockRequest = {
    headers: {},
    ip: '127.0.0.1',
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GrnController],
      providers: [
        { provide: GrnService, useValue: mockGrnService },
        { provide: GrnPostService, useValue: mockGrnPostService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: WorkflowService, useValue: mockWorkflowService },
        {
          provide: ScopeValidationService,
          useValue: mockScopeValidationService,
        },
      ],
    }).compile();

    controller = module.get<GrnController>(GrnController);
    jest.clearAllMocks();
  });

  describe('update', () => {
    it('should throw ForbiddenException for cross-warehouse update', async () => {
      mockGrnService.update.mockRejectedValue(
        new ForbiddenException('Access to this warehouse is not authorized.'),
      );

      await expect(
        controller.update('grn-1', 'user-1', Role.ADMIN, { version: 1 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should succeed for same-warehouse update', async () => {
      const mockGrn = {
        id: 'grn-1',
        grnNumber: 'GRN-001',
        version: 2,
        warehouseId: 'wh-1',
        lines: [],
        createdAt: new Date(),
      };
      mockGrnService.update.mockResolvedValue(mockGrn);

      const result = await controller.update('grn-1', 'user-1', Role.ADMIN, {
        poId: 'po-1',
        warehouseId: 'wh-1',
        version: 1,
      });

      expect(result.data).toBeDefined();
      expect(mockGrnService.update).toHaveBeenCalledWith('grn-1', {
        poId: 'po-1',
        warehouseId: 'wh-1',
        version: 1,
        lines: undefined,
      });
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException for cross-warehouse delete', async () => {
      mockGrnService.remove.mockRejectedValue(
        new ForbiddenException('Access to this warehouse is not authorized.'),
      );

      await expect(
        controller.remove('grn-1', 'user-1', Role.ADMIN, '1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should succeed for same-warehouse delete', async () => {
      mockGrnService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(
        'grn-1',
        'user-1',
        Role.ADMIN,
        '1',
      );

      expect(result).toEqual({ success: true });
      expect(mockGrnService.remove).toHaveBeenCalledWith('grn-1', 1);
    });
  });
});
