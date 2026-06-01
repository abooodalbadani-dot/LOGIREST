import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import {
  CreateLandedCostVoucherSchema,
  UpdateLandedCostVoucherSchema,
  PostLandedCostVoucherSchema,
} from '@logirest/shared-types';
import { LandedCostService } from './landed-cost.service';
import { LandedCostPostService } from './landed-cost-post.service';

@Controller('procurement/landed-cost')
@ApiSecureController()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.PROC_OFFICER, Role.GM)
export class LandedCostController {
  constructor(
    private readonly landedCostService: LandedCostService,
    private readonly landedCostPostService: LandedCostPostService,
  ) {}

  @Post()
  async create(@Body() body: unknown, @CurrentUser('id') userId: string) {
    const parsed = CreateLandedCostVoucherSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const voucher = await this.landedCostService.create({
      ...parsed.data,
      createdById: userId,
    });

    return { data: voucher };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const parsed = UpdateLandedCostVoucherSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const voucher = await this.landedCostService.update(id, parsed.data);
    return { data: voucher };
  }

  @Throttle({ short: { limit: 100, ttl: 60000 } })
  @Post(':id/post')
  @HttpCode(HttpStatus.OK)
  async post(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser('id') userId: string,
  ) {
    const parsed = PostLandedCostVoucherSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const voucher = await this.landedCostPostService.post(id, userId);
    return { data: voucher };
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    const voucher = await this.landedCostService.findById(id);
    return {
      data: {
        id: voucher.id,
        voucherNumber: voucher.voucherNumber,
        status: voucher.status,
        version: voucher.version,
        createdAt: voucher.createdAt,
        updatedAt: voucher.updatedAt,
      },
    };
  }

  @Get()
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.landedCostService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const voucher = await this.landedCostService.findById(id);
    return { data: voucher };
  }
}
