import {
  Controller,
  Get,
  Query,
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
    @ActiveScope('departmentId') departmentId: string | null,
    @CurrentUser('role') role: Role,
    @Query('warehouseId') warehouseIdQuery?: string,
  ) {
    const effectiveWarehouseId = warehouseIdQuery || warehouseId;

    if (effectiveWarehouseId) {
      return this.reportsService.getDashboardStats(role, effectiveWarehouseId);
    }

    if (role === Role.ADMIN || role === Role.GM) {
      return this.reportsService.getGlobalDashboardStats();
    }

    if (role === Role.KITCHEN_CHIEF) {
      if (!departmentId) {
        throw new BadRequestException(
          'Department ID is required for kitchen chief dashboard statistics.',
        );
      }
      return this.reportsService.getKitchenChiefDashboardStats(departmentId);
    }

    return this.reportsService.getGlobalDashboardStats();
  }
}
