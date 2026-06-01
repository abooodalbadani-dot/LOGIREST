import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiSecureController } from '../../decorators/swagger-docs.decorator';
import { InventoryValidationService } from './inventory-validation.service';

@Controller('admin')
@UseGuards(JwtAuthGuard)
@Roles(Role.ADMIN)
@ApiSecureController()
export class InventoryValidationController {
  constructor(private readonly validationService: InventoryValidationService) {}

  @Get('inventory/validate')
  async triggerValidation() {
    return this.validationService.validate();
  }
}
