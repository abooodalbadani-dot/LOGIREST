import {
  Controller,
  Get,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActiveScope } from '../../auth/decorators/active-scope.decorator';
import { ApiSecureController } from '../../decorators/swagger-docs.decorator';
import { ReportsService } from './reports.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class DashboardController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('stats')
  async getDashboardStats(
    @ActiveScope('warehouseId') warehouseId: string,
    @Query('role') role: string,
  ) {
    return this.reportsService.getDashboardStats(role, warehouseId);
  }
}
