import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import { CurrenciesService } from './currencies.service';

@Controller(['currencies', 'master-data/currencies'])
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get()
  async findAll() {
    return this.currenciesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.currenciesService.findOne(id);
  }
}
