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
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import { Role } from '@prisma/client';
import { CreateFXRateDto } from './dto/create-fx-rate.dto';
import type { Request } from 'express';

@Controller('currencies/fx-rates')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class FXRatesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateFXRateDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Req() req: Request,
  ) {
    if (role !== Role.ADMIN && role !== Role.GM) {
      throw new ForbiddenException(
        'Only ADMIN or GM roles are authorized to register new FX rates.',
      );
    }

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
