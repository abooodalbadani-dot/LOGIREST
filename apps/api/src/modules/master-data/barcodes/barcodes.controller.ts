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
import { BarcodesService } from './barcodes.service';
import { CreateBarcodeDto, UpdateBarcodeDto } from './dto/barcode.dto';
import { Role } from '@prisma/client';
import type { Request } from 'express';

@Controller(['barcodes', 'master-data/barcodes'])
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecureController()
export class BarcodesController {
  constructor(private readonly barcodesService: BarcodesService) {}

  @Get()
  @AllRoles()
  async findAll() {
    return this.barcodesService.findAll();
  }

  @Get('check-duplicate')
  @AllRoles()
  async checkDuplicate(@Query('barcode') barcode: string) {
    return this.barcodesService.checkDuplicate(barcode);
  }

  @Get(':id')
  @AllRoles()
  async findOne(@Param('id') id: string) {
    return this.barcodesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.INV_MGR)
  async create(
    @Body() body: CreateBarcodeDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    return this.barcodesService.create(body, userId, ipAddress);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.INV_MGR)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateBarcodeDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const ipAddress =
      (Array.isArray(req.headers['x-forwarded-for'])
        ? req.headers['x-forwarded-for'][0]
        : req.headers['x-forwarded-for']) ||
      req.ip ||
      undefined;

    return this.barcodesService.update(id, body, userId, ipAddress);
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

    return this.barcodesService.remove(id, userId, ipAddress);
  }
}
