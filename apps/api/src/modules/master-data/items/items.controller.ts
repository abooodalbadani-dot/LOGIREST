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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { AllRoles } from '../../../auth/decorators/all-roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import { ItemsService } from './items.service';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';

@Controller(['items', 'master-data/items'])
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecureController()
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  @AllRoles()
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

  @Get('next-code')
  @AllRoles()
  async getNextCode() {
    return this.itemsService.getNextCode();
  }

  @Get(':id')
  @AllRoles()
  async findOne(@Param('id') id: string) {
    return this.itemsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.INV_MGR)
  async create(
    @Body() body: CreateItemDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    return this.itemsService.create(body, userId, ipAddress);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.INV_MGR)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateItemDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
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

    return this.itemsService.remove(id, userId, ipAddress);
  }
}
