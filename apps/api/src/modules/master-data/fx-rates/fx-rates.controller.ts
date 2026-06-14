import { CreateFXRateDto, UpdateFXRateDto } from './dto/create-fx-rate.dto';
import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import { Role } from '@prisma/client';
import type { Request } from 'express';

@Controller('currencies/fx-rates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecureController()
export class FXRatesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.ADMIN, Role.GM, Role.PROC_MGR)
  async create(
    @Body() dto: CreateFXRateDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Verify both currencies exist
      const fromCurr = await tx.currency.findUnique({
        where: { id: dto.fromCurrencyId },
      });
      if (!fromCurr) {
        throw new ForbiddenException('Source currency not found.');
      }

      const toCurr = await tx.currency.findUnique({
        where: { id: dto.toCurrencyId },
      });
      if (!toCurr) {
        throw new ForbiddenException('Target currency not found.');
      }

      if (dto.fromCurrencyId === dto.toCurrencyId) {
        throw new BadRequestException(
          'Source and target currencies must be different.',
        );
      }

      const rate = await tx.fXRate.create({
        data: {
          fromCurrencyId: dto.fromCurrencyId,
          toCurrencyId: dto.toCurrencyId,
          rate: dto.rate,
          effectiveFrom: new Date(dto.effectiveFrom),
        },
      });

      const ipAddress =
        (Array.isArray(req.headers['x-forwarded-for'])
          ? req.headers['x-forwarded-for'][0]
          : req.headers['x-forwarded-for']) ||
        req.ip ||
        undefined;

      await tx.auditLog.create({
        data: {
          userId,
          action: 'FX_RATE_REGISTERED',
          targetTable: 'fx_rates',
          targetId: rate.id,
          beforeStateJson: '{}',
          afterStateJson: JSON.stringify({
            fromCurrencyId: dto.fromCurrencyId,
            toCurrencyId: dto.toCurrencyId,
            rate: dto.rate,
            effectiveFrom: dto.effectiveFrom,
          }),
          ipAddress: ipAddress || null,
        },
      });

      return rate;
    });
  }

  @Get()
  @Roles(
    Role.ADMIN,
    Role.GM,
    Role.INV_MGR,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
    Role.PROC_MGR,
    Role.PROC_OFFICER,
    Role.AUDITOR,
    Role.APPROVER,
  )
  async findAll() {
    return this.prisma.fXRate.findMany({
      orderBy: {
        effectiveFrom: 'desc',
      },
      include: {
        fromCurrency: true,
        toCurrency: true,
      },
    });
  }

  @Get(':id')
  @Roles(
    Role.ADMIN,
    Role.GM,
    Role.INV_MGR,
    Role.STORE_MGR,
    Role.BRANCH_MGR,
    Role.PROC_MGR,
    Role.PROC_OFFICER,
    Role.AUDITOR,
    Role.APPROVER,
  )
  async findOne(@Param('id') id: string) {
    const rate = await this.prisma.fXRate.findUnique({
      where: { id },
      include: {
        fromCurrency: true,
        toCurrency: true,
      },
    });
    if (!rate) {
      throw new NotFoundException(`FX Rate with ID ${id} not found`);
    }
    return rate;
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.GM, Role.PROC_MGR)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFXRateDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const existing = await this.prisma.fXRate.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`FX Rate with ID ${id} not found`);
    }

    if (dto.fromCurrencyId === dto.toCurrencyId) {
      throw new BadRequestException(
        'Source and target currencies must be different.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Concurrency check
      if (dto.version !== undefined && existing.version !== dto.version) {
        throw new ForbiddenException(
          'Conflict detected. The record has been modified by another process.',
        );
      }

      // Verify currencies exist
      const fromCurr = await tx.currency.findUnique({
        where: { id: dto.fromCurrencyId },
      });
      if (!fromCurr) {
        throw new ForbiddenException('Source currency not found.');
      }

      const toCurr = await tx.currency.findUnique({
        where: { id: dto.toCurrencyId },
      });
      if (!toCurr) {
        throw new ForbiddenException('Target currency not found.');
      }

      const updated = await tx.fXRate.update({
        where: { id },
        data: {
          fromCurrencyId: dto.fromCurrencyId,
          toCurrencyId: dto.toCurrencyId,
          rate: dto.rate,
          effectiveFrom: new Date(dto.effectiveFrom),
          version: existing.version + 1,
        },
      });

      const ipAddress =
        (Array.isArray(req.headers['x-forwarded-for'])
          ? req.headers['x-forwarded-for'][0]
          : req.headers['x-forwarded-for']) ||
        req.ip ||
        undefined;

      await tx.auditLog.create({
        data: {
          userId,
          action: 'FX_RATE_UPDATED',
          targetTable: 'fx_rates',
          targetId: id,
          beforeStateJson: JSON.stringify(existing),
          afterStateJson: JSON.stringify(updated),
          ipAddress: ipAddress || null,
        },
      });

      return updated;
    });
  }
}
