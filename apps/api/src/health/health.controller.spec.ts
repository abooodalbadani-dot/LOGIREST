import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../database/prisma.service';
import { BackupService } from '../backup/backup.service';
import { ServiceUnavailableException } from '@nestjs/common';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaMock: any;
  let backupServiceMock: any;

  beforeEach(async () => {
    prismaMock = {
      $queryRaw: jest.fn().mockResolvedValue([1]),
    };
    backupServiceMock = {
      getBackupStatus: jest.fn().mockResolvedValue({
        status: 'ok',
        lastBackupAt: new Date().toISOString(),
        ageHours: 1.5,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: BackupService,
          useValue: backupServiceMock,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('should return status ok when database and backup are healthy', async () => {
      const result = await controller.check();
      expect(result.status).toBe('ok');
      expect(result.checks.database).toBe('ok');
      expect(result.checks.backup.status).toBe('ok');
      expect(result.checks.backup.ageHours).toBe(1.5);
      expect(result.timestamp).toBeDefined();
    });

    it('should return status degraded if database check fails', async () => {
      prismaMock.$queryRaw.mockRejectedValue(
        new Error('DB Connection Timeout'),
      );
      const result = await controller.check();
      expect(result.status).toBe('degraded');
      expect(result.checks.database).toBe('degraded');
      expect(result.checks.backup.status).toBe('ok');
    });

    it('should return status degraded if backup check is degraded', async () => {
      backupServiceMock.getBackupStatus.mockResolvedValue({
        status: 'degraded',
        lastBackupAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
        ageHours: 30.0,
      });
      const result = await controller.check();
      expect(result.status).toBe('degraded');
      expect(result.checks.database).toBe('ok');
      expect(result.checks.backup.status).toBe('degraded');
      expect(result.checks.backup.ageHours).toBe(30.0);
    });
  });

  describe('checkBackup', () => {
    it('should throw ServiceUnavailableException if backup is degraded', async () => {
      backupServiceMock.getBackupStatus.mockResolvedValue({
        status: 'degraded',
        lastBackupAt: null,
        ageHours: null,
      });
      await expect(controller.checkBackup()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should return status HEALTHY if backup is fresh', async () => {
      const lastBackupDate = new Date();
      backupServiceMock.getBackupStatus.mockResolvedValue({
        status: 'ok',
        lastBackupAt: lastBackupDate.toISOString(),
        ageHours: 2.0,
      });

      const result = await controller.checkBackup();
      expect(result.status).toBe('HEALTHY');
      expect(result.lastSuccess).toBe(lastBackupDate.toISOString());
      expect(result.ageHours).toBe(2.0);
    });
  });
});
