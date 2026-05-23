import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  BadRequestException,
  NotFoundException,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { Request } from 'express';

@Controller('master-data/warehouses')
export class WarehousesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('includeArchived') includeArchived?: string) {
    const filter = includeArchived === 'true' ? {} : { isActive: true };
    return this.prisma.warehouse.findMany({
      where: filter,
      include: {
        branch: true,
      },
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        branch: true,
      },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }
    return warehouse;
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  async archive(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    if (!warehouse.isActive) {
      throw new BadRequestException('Warehouse is already archived');
    }

    // 1. Check if the warehouse has active inventory (qtyOnHand > 0)
    const stockAggregation = await this.prisma.warehouseItem.aggregate({
      where: { warehouseId: id },
      _sum: {
        qtyOnHand: true,
      },
    });

    const totalStock = stockAggregation._sum.qtyOnHand
      ? Number(stockAggregation._sum.qtyOnHand)
      : 0;

    if (totalStock > 0) {
      throw new BadRequestException(
        'Cannot archive warehouse with active inventory. Current stock: ' +
          totalStock,
      );
    }

    // 2. Perform archiving update
    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.warehouse.findUnique({
        where: { id },
        select: { version: true },
      });

      if (!current) {
        throw new NotFoundException(`Warehouse with ID ${id} not found`);
      }

      const res = await tx.warehouse.update({
        where: { id },
        data: {
          isActive: false,
          version: current.version + 1,
        },
      });

      const ipAddress =
        (Array.isArray(req.headers['x-forwarded-for'])
          ? req.headers['x-forwarded-for'][0]
          : req.headers['x-forwarded-for']) ||
        req.ip ||
        undefined;

      // 3. Log the action in AuditLog
      await tx.auditLog.create({
        data: {
          userId,
          action: 'WAREHOUSE_ARCHIVED',
          targetTable: 'warehouses',
          targetId: id,
          beforeStateJson: JSON.stringify({
            isActive: true,
            version: current.version,
          }),
          afterStateJson: JSON.stringify({
            isActive: false,
            version: current.version + 1,
          }),
          ipAddress: ipAddress || null,
        },
      });

      return res;
    });

    return updated;
  }
}
