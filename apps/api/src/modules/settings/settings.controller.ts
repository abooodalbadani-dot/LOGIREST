import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('currency')
  @Roles(
    Role.ADMIN,
    Role.GM,
    Role.INV_MGR,
    Role.WH_KEEPER,
    Role.PROC_OFFICER,
    Role.APPROVER,
    Role.AUDITOR,
    Role.VIEWER,
    Role.KITCHEN_CHIEF,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
    Role.PROC_MGR,
  )
  async getCurrency() {
    return this.settingsService.getBaseCurrency();
  }

  @Get('print')
  @Roles(
    Role.ADMIN,
    Role.GM,
    Role.INV_MGR,
    Role.WH_KEEPER,
    Role.PROC_OFFICER,
    Role.APPROVER,
    Role.AUDITOR,
    Role.VIEWER,
    Role.KITCHEN_CHIEF,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
    Role.PROC_MGR,
  )
  async getPrintSettings() {
    return this.settingsService.getPrintSettings();
  }
}
