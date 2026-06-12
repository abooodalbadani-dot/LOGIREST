import {
  Controller,
  Get,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ActiveScope } from '../../auth/decorators/active-scope.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ApiSecureController } from '../../decorators/swagger-docs.decorator';
import { ReportsService } from './reports.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  Role.ADMIN,
  Role.GM,
  Role.INV_MGR,
  Role.WH_KEEPER,
  Role.PROC_OFFICER,
  Role.STORE_MGR,
  Role.KITCHEN_CHIEF,
  Role.APPROVER,
  Role.AUDITOR,
  Role.VIEWER,
  Role.BRANCH_MGR,
  Role.PROC_MGR,
)
@ApiSecureController()
export class DashboardController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('stats')
  async getDashboardStats(
    @ActiveScope('warehouseId') warehouseId: string | null,
    @CurrentUser('role') role: Role,
  ) {
    if (role === Role.ADMIN || role === Role.GM) {
      return this.reportsService.getGlobalDashboardStats();
    }
    if (!warehouseId) {
      throw new BadRequestException(
        'Warehouse ID is required for scoped dashboard statistics.',
      );
    }
    return this.reportsService.getDashboardStats(role, warehouseId);
  }
}
