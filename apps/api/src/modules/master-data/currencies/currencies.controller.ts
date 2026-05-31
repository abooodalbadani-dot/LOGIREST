import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
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

  @Post()
  async create(@Body() body: any) {
    return this.currenciesService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.currenciesService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.currenciesService.remove(id);
  }
}
