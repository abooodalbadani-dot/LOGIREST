import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { AllRoles } from '../../../auth/decorators/all-roles.decorator';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import { YieldService } from './yield.service';
import type { CreateYieldBatchDto } from './yield.service';

@Controller('operations/yield')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecureController()
export class YieldController {
  constructor(private readonly yieldService: YieldService) {}

  @Get()
  @AllRoles()
  async findAll() {
    return this.yieldService.findAll();
  }

  @Get(':id')
  @AllRoles()
  async findOne(@Param('id') id: string) {
    return this.yieldService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.INV_MGR)
  async create(@Body() body: CreateYieldBatchDto) {
    return this.yieldService.create(body);
  }
}
