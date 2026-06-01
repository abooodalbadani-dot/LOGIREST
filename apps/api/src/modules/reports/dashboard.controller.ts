import {
  Controller,
  Get,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveScope } from '../../auth/decorators/active-scope.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ApiSecureController } from '../../decorators/swagger-docs.decorator';
import { ReportsService } from './reports.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
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
