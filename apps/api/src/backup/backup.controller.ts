import {
  Controller,
  Post,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BackupService } from './backup.service';
import { Role } from '@prisma/client';
import { ApiSecureController } from '../decorators/swagger-docs.decorator';

@Controller('backup')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('run')
  async runManualBackup(@CurrentUser('role') role: Role) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only administrative users are authorized to manually trigger database backups.',
      );
    }
    const result = await this.backupService.runBackup();
    return {
      success: true,
      message: 'Database backup manually triggered and completed successfully.',
      ...result,
    };
  }
}
