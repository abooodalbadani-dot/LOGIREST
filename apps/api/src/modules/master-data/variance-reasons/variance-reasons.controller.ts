import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import { VarianceReasonsService } from './variance-reasons.service';

@Controller('master-data/variance-reasons')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecureController()
export class VarianceReasonsController {
  constructor(private readonly service: VarianceReasonsService) {}

  @Get()
  async findAll() {
    return this.service.findAll();
  }
}
