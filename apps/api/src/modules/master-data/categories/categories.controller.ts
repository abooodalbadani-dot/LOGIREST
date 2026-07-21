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
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { AllRoles } from '../../../auth/decorators/all-roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import { CategoriesService } from './categories.service';
import type { Request } from 'express';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Controller(['categories', 'master-data/categories'])
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecureController()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @AllRoles()
  async findAll(@Query('search') search?: string) {
    return this.categoriesService.findAll(search);
  }

  @Get(':id')
  @AllRoles()
  async findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.INV_MGR)
  async create(
    @Body() body: CreateCategoryDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    return this.categoriesService.create(body, userId, ipAddress);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.INV_MGR)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCategoryDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    return this.categoriesService.update(id, body, userId, ipAddress);
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

    return this.categoriesService.remove(id, userId, ipAddress);
  }
}
