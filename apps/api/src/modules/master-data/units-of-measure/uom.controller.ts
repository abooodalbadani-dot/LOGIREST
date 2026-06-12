import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import { UomService } from './uom.service';
import { Role } from '@prisma/client';
import type { Request } from 'express';

@Controller(['units-of-measure', 'master-data/units-of-measure'])
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecureController()
export class UomController {
  constructor(private readonly uomService: UomService) {}

  @Get()
  async findAll() {
    return this.uomService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.uomService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.GM)
  async create(
    @Body() body: Record<string, unknown>,
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
  @Roles(Role.ADMIN, Role.GM)
  async update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
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
  @Roles(Role.ADMIN, Role.GM)
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
