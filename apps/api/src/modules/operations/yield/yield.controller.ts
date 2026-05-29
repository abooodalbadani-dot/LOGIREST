import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import { YieldService } from './yield.service';

@Controller('operations/yield')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class YieldController {
  constructor(private readonly yieldService: YieldService) {}

  @Get()
  async findAll() {
    return this.yieldService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.yieldService.findOne(id);
  }

  @Post()
  async create(@Body() body: any) {
    return this.yieldService.create(body);
  }
}
