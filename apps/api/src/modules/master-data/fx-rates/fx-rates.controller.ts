import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import { Role } from '@prisma/client';
import { CreateFXRateDto } from './dto/create-fx-rate.dto';
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
}
