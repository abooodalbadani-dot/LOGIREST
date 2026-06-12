import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { BackupService } from '../backup/backup.service';
import { BackupCalculatorService } from '../modules/health/backup-calculator.service';

describe('HealthController', () => {
  let controller: HealthController;
  let backupServiceMock: Record<string, jest.Mock>;

  beforeEach(async () => {
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
          provide: BackupService,
          useValue: backupServiceMock,
        },
        BackupCalculatorService,
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('should return simple binary status ok without hitting database', async () => {
      const result = await controller.check();
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('checkBackup', () => {
    it('should return calculated RPO details when backup is fresh', async () => {
      const lastBackupDate = new Date();
      backupServiceMock.getBackupStatus.mockResolvedValue({
        status: 'ok',
        lastBackupAt: lastBackupDate.toISOString(),
        ageHours: 2.0,
      });

      const result = await controller.checkBackup();
      expect(result.lastBackupTimestamp).toBe(lastBackupDate.toISOString());
      expect(result.rpoDeltaSeconds).toBeGreaterThanOrEqual(0);
      expect(result.backups).toEqual([]);
    });

    it('should handle missing/never run backups correctly', async () => {
      backupServiceMock.getBackupStatus.mockResolvedValue({
        status: 'critical',
        lastBackupAt: null,
        ageHours: null,
      });

      const result = await controller.checkBackup();
      expect(result.lastBackupTimestamp).toBe('');
      expect(result.rpoDeltaSeconds).toBe(-1);
      expect(result.backups).toEqual([]);
    });
  });
});
