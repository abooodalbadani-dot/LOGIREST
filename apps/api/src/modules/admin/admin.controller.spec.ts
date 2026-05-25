import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { PrismaService } from '../../database/prisma.service';
import { AdminService } from './admin.service';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('AdminController', () => {
  let controller: AdminController;

  const mockPrismaService = {
    reconciliationRun: {
      count: jest.fn(),
    },
  };

  const mockAdminService = {
    getRoles: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AdminService, useValue: mockAdminService },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    jest.clearAllMocks();
  });

  describe('getReconciliationRuns', () => {
    it('should throw ForbiddenException if user role is not ADMIN', async () => {
      await expect(
        controller.getReconciliationRuns(Role.INV_MGR, '1', '50'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getRoles', () => {
    it('should throw ForbiddenException if user role is not ADMIN', async () => {
      await expect(
        controller.getRoles(Role.INV_MGR),
      ).rejects.toThrow(ForbiddenException);
      expect(mockAdminService.getRoles).not.toHaveBeenCalled();
    });

    it('should return roles list from AdminService for ADMIN', async () => {
      const mockRoles = [
        { id: 'ADMIN', displayName: 'Administrator', userCount: 2, permissions: [] },
      ];
      mockAdminService.getRoles.mockResolvedValue(mockRoles);

      const result = await controller.getRoles(Role.ADMIN);

      expect(result).toEqual(mockRoles);
      expect(mockAdminService.getRoles).toHaveBeenCalled();
    });
  });
});

