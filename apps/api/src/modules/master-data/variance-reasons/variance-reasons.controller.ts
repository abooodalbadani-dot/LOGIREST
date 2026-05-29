import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import { VarianceReasonsService } from './variance-reasons.service';

@Controller('master-data/variance-reasons')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class VarianceReasonsController {
  constructor(private readonly service: VarianceReasonsService) {}

  @Get()
  async findAll() {
    return this.service.findAll();
  }
}
