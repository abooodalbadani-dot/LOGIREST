import { Injectable, Logger } from '@nestjs/common';

export interface RpoResult {
  rpoDeltaSeconds: number;
  lastBackupTimestamp: string;
  status: 'ok' | 'degraded' | 'critical';
}

export interface BackupSummary {
  fileKey: string;
  sizeBytes: number;
  isEncrypted: boolean;
  status: string;
}

export interface BackupDetails {
  lastBackupTimestamp: string;
  rpoDeltaSeconds: number;
  backups: BackupSummary[];
}

@Injectable()
export class BackupCalculatorService {
  private readonly logger = new Logger(BackupCalculatorService.name);

  calculateRpo(lastBackupAt: string | null): RpoResult {
    if (!lastBackupAt) {
      return {
        rpoDeltaSeconds: -1,
        lastBackupTimestamp: '',
        status: 'critical',
      };
    }

    const backupTime = new Date(lastBackupAt).getTime();
    const now = Date.now();
    const deltaMs = now - backupTime;
    const deltaSeconds = Math.floor(deltaMs / 1000);
    const deltaHours = deltaSeconds / 3600;

    let status: 'ok' | 'degraded' | 'critical';
    if (deltaHours <= 26) {
      status = 'ok';
    } else if (deltaHours <= 48) {
      status = 'degraded';
    } else {
      status = 'critical';
    }

    return {
      rpoDeltaSeconds: deltaSeconds,
      lastBackupTimestamp: new Date(backupTime).toISOString(),
      status,
    };
  }

  formatBackupDetails(
    lastBackupAt: string | null,
    backups: BackupSummary[],
  ): BackupDetails {
    const rpo = this.calculateRpo(lastBackupAt);
    return {
      lastBackupTimestamp: rpo.lastBackupTimestamp,
      rpoDeltaSeconds: rpo.rpoDeltaSeconds,
      backups,
    };
  }
}
