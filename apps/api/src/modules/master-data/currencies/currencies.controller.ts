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
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
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
  @Roles(Role.ADMIN, Role.GM)
  async create(@Body() body: Record<string, unknown>) {
    return this.currenciesService.create(body);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.GM)
  async update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.currenciesService.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.GM)
  async remove(@Param('id') id: string) {
    return this.currenciesService.remove(id);
  }
}
