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
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import { UomService } from './uom.service';
import { Role } from '@prisma/client';
import type { Request } from 'express';

@Controller(['units-of-measure', 'master-data/units-of-measure'])
@UseGuards(JwtAuthGuard)
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
  async create(
    @Body() body: any,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Req() req: Request,
  ) {
    if (role !== Role.ADMIN && role !== Role.GM) {
      throw new ForbiddenException(
        'Only ADMIN or GM roles are authorized to modify master data.',
      );
    }
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    return this.uomService.create(body, userId, ipAddress);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Req() req: Request,
  ) {
    if (role !== Role.ADMIN && role !== Role.GM) {
      throw new ForbiddenException(
        'Only ADMIN or GM roles are authorized to modify master data.',
      );
    }
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
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Req() req: Request,
  ) {
    if (role !== Role.ADMIN && role !== Role.GM) {
      throw new ForbiddenException(
        'Only ADMIN or GM roles are authorized to modify master data.',
      );
    }
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    return this.uomService.remove(id, userId, ipAddress);
  }
}
