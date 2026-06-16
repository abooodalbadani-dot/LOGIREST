import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { BackupService } from './backup.service';
import { Role } from '@prisma/client';
import { ApiSecureController } from '../decorators/swagger-docs.decorator';

@Controller('backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecureController()
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('run')
  @Roles(Role.ADMIN)
  async runManualBackup() {
    const result = await this.backupService.runBackup();
    return {
      success: true,
      message: 'Database backup manually triggered and completed successfully.',
      ...result,
    };
  }
}
