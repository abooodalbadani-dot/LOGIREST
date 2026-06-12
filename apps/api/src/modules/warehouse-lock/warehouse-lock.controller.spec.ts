import { Test, TestingModule } from '@nestjs/testing';
import { WarehouseLockController } from './warehouse-lock.controller';
import { WarehouseLockService } from './warehouse-lock.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { Request } from 'express';

describe('WarehouseLockController', () => {
  let controller: WarehouseLockController;

  const mockWarehouseLockService = {
    forceUnlock: jest.fn(),
    manualUnlock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WarehouseLockController],
      providers: [
        { provide: WarehouseLockService, useValue: mockWarehouseLockService },
      ],
    }).compile();

    controller = module.get<WarehouseLockController>(WarehouseLockController);
    jest.clearAllMocks();
  });

  const mockRequest = (ip = '127.0.0.1') => {
    return {
      ip,
    } as unknown as Request;
  };

  describe('forceUnlock', () => {
    it('should throw ForbiddenException if user role is not admin', async () => {
      const req = mockRequest();
      await expect(
        controller.forceUnlock(
          'lock-1',
          'user-1',
          'PROC_OFFICER',
          { reasonNotes: 'Some long enough reason notes' },
          req,
        ),
      ).rejects.toThrow(new ForbiddenException('Forbidden resource'));

      expect(mockWarehouseLockService.forceUnlock).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if reasonNotes is missing', async () => {
      const req = mockRequest();
      await expect(
        controller.forceUnlock(
          'lock-1',
          'admin-1',
          'ADMIN',
          undefined as unknown as { reasonNotes: string },
          req,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if reasonNotes is too short', async () => {
      const req = mockRequest();
      await expect(
        controller.forceUnlock(
          'lock-1',
          'admin-1',
          'ADMIN',
          { reasonNotes: 'short' },
          req,
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'reasonNotes must be longer than or equal to 10 characters',
        ),
      );
    });

    it('should call service forceUnlock if role is ADMIN and reason notes are valid', async () => {
      const req = mockRequest('192.168.1.1');
      const mockResult = { id: 'lock-1', isActive: false };
      mockWarehouseLockService.forceUnlock.mockResolvedValue(mockResult);

      const result = await controller.forceUnlock(
        'lock-1',
        'admin-1',
        'ADMIN',
        { reasonNotes: 'This is a long enough note' },
        req,
      );

      expect(result).toEqual(mockResult);
      expect(mockWarehouseLockService.forceUnlock).toHaveBeenCalledWith(
        'lock-1',
        'admin-1',
        'This is a long enough note',
        '192.168.1.1',
      );
    });
  });

  describe('manualUnlock', () => {
    it('should throw ForbiddenException if role is not ADMIN or INV_MGR', async () => {
      const req = mockRequest();
      await expect(
        controller.manualUnlock('lock-1', 'user-1', 'WH_KEEPER', req),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should unlock successfully when role is ADMIN', async () => {
      const req = mockRequest('127.0.0.1');
      const mockUpdated = {
        id: 'lock-1',
        isActive: false,
        updatedAt: new Date('2026-05-23T15:47:00Z'),
      };
      mockWarehouseLockService.manualUnlock.mockResolvedValue(mockUpdated);

      const result = await controller.manualUnlock(
        'lock-1',
        'admin-1',
        'ADMIN',
        req,
      );

      expect(result).toEqual({
        success: true,
        message: 'Warehouse lock successfully released.',
        deactivatedAt: expect.any(String),
      });
      expect(mockWarehouseLockService.manualUnlock).toHaveBeenCalledWith(
        'lock-1',
        'admin-1',
        '127.0.0.1',
      );
    });

    it('should unlock successfully when role is INV_MGR', async () => {
      const req = mockRequest('127.0.0.1');
      const mockUpdated = {
        id: 'lock-1',
        isActive: false,
        updatedAt: new Date('2026-05-23T15:47:00Z'),
      };
      mockWarehouseLockService.manualUnlock.mockResolvedValue(mockUpdated);

      const result = await controller.manualUnlock(
        'lock-1',
        'mgr-1',
        'INV_MGR',
        req,
      );

      expect(result).toEqual({
        success: true,
        message: 'Warehouse lock successfully released.',
        deactivatedAt: expect.any(String),
      });
      expect(mockWarehouseLockService.manualUnlock).toHaveBeenCalledWith(
        'lock-1',
        'mgr-1',
        '127.0.0.1',
      );
    });
  });
});
