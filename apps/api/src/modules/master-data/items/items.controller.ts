import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
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
import { ItemsService } from './items.service';
import { Role } from '@prisma/client';
import type { Request } from 'express';

@Controller(['items', 'master-data/items'])
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('category_id') category_id?: string,
    @Query('is_active') is_active?: string,
    @Query('barcode') barcode?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.itemsService.findAll({
      search,
      category_id,
      is_active,
      barcode,
      page,
      limit,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.itemsService.findOne(id);
  }

  @Post()
  async create(
    @Body() body: Record<string, unknown>,
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

    return this.itemsService.create(body, userId, ipAddress);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
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

    return this.itemsService.update(id, body, userId, ipAddress);
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

    return this.itemsService.remove(id, userId, ipAddress);
  }
}
