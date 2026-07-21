import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { AllRoles } from '../../../auth/decorators/all-roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import { UomService } from './uom.service';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { CreateUomDto, UpdateUomDto } from './dto/uom.dto';

@Controller(['units-of-measure', 'master-data/units-of-measure'])
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecureController()
export class UomController {
  constructor(private readonly uomService: UomService) {}

  @Get()
  @AllRoles()
  async findAll(@Query() query: { search?: string; page?: string; limit?: string }) {
    return this.uomService.findAll(query);
  }

  @Get(':id')
  @AllRoles()
  async findOne(@Param('id') id: string) {
    return this.uomService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.INV_MGR)
  async create(
    @Body() body: CreateUomDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    return this.uomService.create(body, userId, ipAddress);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.INV_MGR)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateUomDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    return this.uomService.update(id, body, userId, ipAddress);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.INV_MGR)
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    return this.uomService.remove(id, userId, ipAddress);
  }
}
