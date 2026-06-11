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
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import { BarcodesService } from './barcodes.service';
import type { Request } from 'express';

@Controller(['barcodes', 'master-data/barcodes'])
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class BarcodesController {
  constructor(private readonly barcodesService: BarcodesService) {}

  @Get()
  async findAll() {
    return this.barcodesService.findAll();
  }

  @Get('check-duplicate')
  async checkDuplicate(@Query('barcode') barcode: string) {
    return this.barcodesService.checkDuplicate(barcode);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.barcodesService.findOne(id);
  }

  @Post()
  async create(
    @Body() body: { itemId: string; code: string },
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
  async update(
    @Param('id') id: string,
    @Body() body: { itemId?: string; code?: string; version?: number },
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
