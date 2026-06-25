import { CreateFXRateDto, UpdateFXRateDto } from './dto/create-fx-rate.dto';
import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
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
import { Role, Prisma } from '@prisma/client';
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
    if (dto.rate <= 0) {
      throw new BadRequestException('Rate must be positive.');
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

      if (dto.fromCurrencyId === dto.toCurrencyId) {
        throw new BadRequestException(
          'Source and target currencies must be different.',
        );
      }

      const effectiveDate = new Date(dto.effectiveFrom);

      if (dto.isActive !== false) {
        await tx.fXRate.updateMany({
          where: {
            fromCurrencyId: dto.fromCurrencyId,
            toCurrencyId: dto.toCurrencyId,
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });

        await tx.fXRate.updateMany({
          where: {
            fromCurrencyId: dto.toCurrencyId,
            toCurrencyId: dto.fromCurrencyId,
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });
      }

      const rate = await tx.fXRate.create({
        data: {
          fromCurrencyId: dto.fromCurrencyId,
          toCurrencyId: dto.toCurrencyId,
          rate: dto.rate,
          effectiveFrom: effectiveDate,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
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
            isActive: dto.isActive !== undefined ? dto.isActive : true,
          }),
          ipAddress: ipAddress || null,
        },
      });

      // Save/Upsert the inverse rate (B -> A = 1 / R) with 8 decimal precision
      const inverseRateValue =
        Math.round((1 / dto.rate) * 100000000) / 100000000;

      const existingInverse = await tx.fXRate.findUnique({
        where: {
          fromCurrencyId_toCurrencyId_effectiveFrom: {
            fromCurrencyId: dto.toCurrencyId,
            toCurrencyId: dto.fromCurrencyId,
            effectiveFrom: effectiveDate,
          },
        },
      });

      let inverseRate;
      if (existingInverse) {
        inverseRate = await tx.fXRate.update({
          where: { id: existingInverse.id },
          data: {
            rate: inverseRateValue,
            isActive: dto.isActive !== undefined ? dto.isActive : true,
            version: existingInverse.version + 1,
          },
        });

        await tx.auditLog.create({
          data: {
            userId,
            action: 'FX_RATE_UPDATED',
            targetTable: 'fx_rates',
            targetId: inverseRate.id,
            beforeStateJson: JSON.stringify(existingInverse),
            afterStateJson: JSON.stringify(inverseRate),
            ipAddress: ipAddress || null,
          },
        });
      } else {
        inverseRate = await tx.fXRate.create({
          data: {
            fromCurrencyId: dto.toCurrencyId,
            toCurrencyId: dto.fromCurrencyId,
            rate: inverseRateValue,
            effectiveFrom: effectiveDate,
            isActive: dto.isActive !== undefined ? dto.isActive : true,
            version: 1,
          },
        });

        await tx.auditLog.create({
          data: {
            userId,
            action: 'FX_RATE_REGISTERED',
            targetTable: 'fx_rates',
            targetId: inverseRate.id,
            beforeStateJson: '{}',
            afterStateJson: JSON.stringify(inverseRate),
            ipAddress: ipAddress || null,
          },
        });
      }

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
  async findAll(
    @Query() query?: { from?: string; to?: string; isActive?: string },
  ) {
    const where: Prisma.FXRateWhereInput = {};
    if (query?.from && query?.to) {
      where.OR = [
        {
          fromCurrency: { code: query.from },
          toCurrency: { code: query.to },
        },
        {
          fromCurrencyId: query.from,
          toCurrencyId: query.to,
        },
      ];
    }
    if (query?.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    return this.prisma.fXRate.findMany({
      where,
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
    if (dto.rate <= 0) {
      throw new BadRequestException('Rate must be positive.');
    }

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

      const newEffectiveFrom = new Date(dto.effectiveFrom);

      if (dto.isActive === true) {
        await tx.fXRate.updateMany({
          where: {
            fromCurrencyId: dto.fromCurrencyId,
            toCurrencyId: dto.toCurrencyId,
            isActive: true,
            id: { not: id },
          },
          data: {
            isActive: false,
          },
        });
      }

      const updated = await tx.fXRate.update({
        where: { id },
        data: {
          fromCurrencyId: dto.fromCurrencyId,
          toCurrencyId: dto.toCurrencyId,
          rate: dto.rate,
          effectiveFrom: newEffectiveFrom,
          isActive: dto.isActive !== undefined ? dto.isActive : undefined,
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

      // Update/Upsert the corresponding inverse rate (B -> A = 1 / R) with 8 decimal precision
      const newInverseRate = Math.round((1 / dto.rate) * 100000000) / 100000000;

      const oldInverse = await tx.fXRate.findUnique({
        where: {
          fromCurrencyId_toCurrencyId_effectiveFrom: {
            fromCurrencyId: existing.toCurrencyId,
            toCurrencyId: existing.fromCurrencyId,
            effectiveFrom: existing.effectiveFrom,
          },
        },
      });

      if (dto.isActive === true) {
        await tx.fXRate.updateMany({
          where: {
            fromCurrencyId: dto.toCurrencyId,
            toCurrencyId: dto.fromCurrencyId,
            isActive: true,
            id: oldInverse ? { not: oldInverse.id } : undefined,
          },
          data: {
            isActive: false,
          },
        });
      }

      if (oldInverse) {
        const updatedInverse = await tx.fXRate.update({
          where: { id: oldInverse.id },
          data: {
            fromCurrencyId: dto.toCurrencyId,
            toCurrencyId: dto.fromCurrencyId,
            rate: newInverseRate,
            effectiveFrom: newEffectiveFrom,
            isActive: dto.isActive !== undefined ? dto.isActive : undefined,
            version: oldInverse.version + 1,
          },
        });

        await tx.auditLog.create({
          data: {
            userId,
            action: 'FX_RATE_UPDATED',
            targetTable: 'fx_rates',
            targetId: oldInverse.id,
            beforeStateJson: JSON.stringify(oldInverse),
            afterStateJson: JSON.stringify(updatedInverse),
            ipAddress: ipAddress || null,
          },
        });
      } else {
        const existingNewInverse = await tx.fXRate.findUnique({
          where: {
            fromCurrencyId_toCurrencyId_effectiveFrom: {
              fromCurrencyId: dto.toCurrencyId,
              toCurrencyId: dto.fromCurrencyId,
              effectiveFrom: newEffectiveFrom,
            },
          },
        });

        if (existingNewInverse) {
          const updatedInverse = await tx.fXRate.update({
            where: { id: existingNewInverse.id },
            data: {
              rate: newInverseRate,
              isActive: dto.isActive !== undefined ? dto.isActive : undefined,
              version: existingNewInverse.version + 1,
            },
          });

          await tx.auditLog.create({
            data: {
              userId,
              action: 'FX_RATE_UPDATED',
              targetTable: 'fx_rates',
              targetId: existingNewInverse.id,
              beforeStateJson: JSON.stringify(existingNewInverse),
              afterStateJson: JSON.stringify(updatedInverse),
              ipAddress: ipAddress || null,
            },
          });
        } else {
          const createdInverse = await tx.fXRate.create({
            data: {
              fromCurrencyId: dto.toCurrencyId,
              toCurrencyId: dto.fromCurrencyId,
              rate: newInverseRate,
              effectiveFrom: newEffectiveFrom,
              isActive: dto.isActive !== undefined ? dto.isActive : true,
              version: 1,
            },
          });

          await tx.auditLog.create({
            data: {
              userId,
              action: 'FX_RATE_REGISTERED',
              targetTable: 'fx_rates',
              targetId: createdInverse.id,
              beforeStateJson: '{}',
              afterStateJson: JSON.stringify(createdInverse),
              ipAddress: ipAddress || null,
            },
          });
        }
      }

      return updated;
    });
  }
}
