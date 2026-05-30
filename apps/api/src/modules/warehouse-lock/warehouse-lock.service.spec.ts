import { Test, TestingModule } from '@nestjs/testing';
import { WarehouseLockService } from './warehouse-lock.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('WarehouseLockService', () => {
  let service: WarehouseLockService;

  const mockPrisma = {
    warehouseLock: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((cb) => {
      const tx = {
        warehouseLock: {
          update: mockPrisma.warehouseLock.update,
        },
        auditLog: {
          create: mockPrisma.auditLog.create,
        },
      };
      return cb(tx);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseLockService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WarehouseLockService>(WarehouseLockService);
    jest.clearAllMocks();
  });

  describe('forceUnlock', () => {
    it('should throw NotFoundException if lock does not exist', async () => {
      mockPrisma.warehouseLock.findUnique.mockResolvedValue(null);

      await expect(
        service.forceUnlock('lock-1', 'admin-1', 'Valid Reason Notes'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if lock is already inactive', async () => {
      const mockLock = { id: 'lock-1', isActive: false };
      mockPrisma.warehouseLock.findUnique.mockResolvedValue(mockLock);

      await expect(
        service.forceUnlock('lock-1', 'admin-1', 'Valid Reason Notes'),
      ).rejects.toThrow(new BadRequestException('Lock is not active.'));
    });

    it('should deactivate lock and log manual override event in audit log within transaction', async () => {
      const expiresAt = new Date();
      const mockLock = {
        id: 'lock-1',
        isActive: true,
        expiresAt,
        warehouseId: 'wh-1',
        status: 'ACTIVE',
      };
      mockPrisma.warehouseLock.findUnique.mockResolvedValue(mockLock);
      mockPrisma.warehouseLock.update.mockResolvedValue({
        ...mockLock,
        isActive: false,
        status: 'RELEASED',
      });

      const result = await service.forceUnlock(
        'lock-1',
        'admin-1',
        'This is a valid reason notes length.',
        '127.0.0.1',
      );

      expect(result.isActive).toBe(false);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.warehouseLock.update).toHaveBeenCalledWith({
        where: { id: 'lock-1' },
        data: { isActive: false, status: 'RELEASED' },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'admin-1',
          action: 'FORCE_UNLOCK',
          targetTable: 'warehouse_locks',
          targetId: 'lock-1',
          beforeStateJson: JSON.stringify({
            isActive: true,
            status: mockLock.status,
            expiresAt: mockLock.expiresAt,
            warehouseId: mockLock.warehouseId,
          }),
          afterStateJson: JSON.stringify({
            isActive: false,
            status: 'RELEASED',
            reason_notes: 'This is a valid reason notes length.',
          }),
          ipAddress: '127.0.0.1',
        },
      });
    });
  });

  describe('manualUnlock', () => {
    it('should throw NotFoundException if lock does not exist', async () => {
      mockPrisma.warehouseLock.findUnique.mockResolvedValue(null);

      await expect(service.manualUnlock('lock-1', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if lock is already inactive', async () => {
      const mockLock = { id: 'lock-1', isActive: false };
      mockPrisma.warehouseLock.findUnique.mockResolvedValue(mockLock);

      await expect(service.manualUnlock('lock-1', 'admin-1')).rejects.toThrow(
        new BadRequestException('Lock is not active.'),
      );
    });

    it('should deactivate lock and log manual unlock event in audit log within transaction', async () => {
      const expiresAt = new Date();
      const mockLock = {
        id: 'lock-1',
        isActive: true,
        expiresAt,
        warehouseId: 'wh-1',
        status: 'STALE',
      };
      mockPrisma.warehouseLock.findUnique.mockResolvedValue(mockLock);
      mockPrisma.warehouseLock.update.mockResolvedValue({
        ...mockLock,
        isActive: false,
        status: 'RELEASED',
      });

      const result = await service.manualUnlock(
        'lock-1',
        'admin-1',
        '127.0.0.1',
      );

      expect(result.isActive).toBe(false);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.warehouseLock.update).toHaveBeenCalledWith({
        where: { id: 'lock-1' },
        data: { isActive: false, status: 'RELEASED' },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'admin-1',
          action: 'MANUAL_UNLOCK',
          targetTable: 'warehouse_locks',
          targetId: 'lock-1',
          beforeStateJson: JSON.stringify({
            isActive: true,
            status: mockLock.status,
            expiresAt: mockLock.expiresAt,
            warehouseId: mockLock.warehouseId,
          }),
          afterStateJson: JSON.stringify({
            isActive: false,
            status: 'RELEASED',
          }),
          ipAddress: '127.0.0.1',
        },
      });
    });
  });
});
