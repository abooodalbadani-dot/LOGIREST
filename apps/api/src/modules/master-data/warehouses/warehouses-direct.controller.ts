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
  NotFoundException,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { Request } from 'express';

@Controller('warehouses')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class WarehousesDirectController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(
    @Query('branch_id') branchId?: string,
    @Query('limit') limit?: string,
  ) {
    const take = limit ? parseInt(limit, 10) : undefined;
    const filter: any = { isActive: true };
    if (branchId) {
      filter.branchId = branchId;
    }
    const warehouses = await this.prisma.warehouse.findMany({
      where: filter,
      take,
      include: {
        branch: true,
      },
      orderBy: { name: 'asc' },
    });
    return {
      data: warehouses,
      meta: {
        total: warehouses.length,
        page: 1,
        page_size: take || warehouses.length,
        total_pages: 1,
      },
    };
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

    const stockCount = await this.prisma.warehouseItem.count({
      where: {
        warehouseId: id,
        qtyOnHand: { gt: 0 },
      },
    });

    return {
      ...warehouse,
      has_stock: stockCount > 0,
    };
  }

  @Post()
  async create(@Body() body: any) {
    return this.prisma.warehouse.create({
      data: {
        name: body.name,
        code: body.code,
        branchId: body.branchId,
        isActive: true,
      },
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.prisma.warehouse.update({
      where: { id },
      data: {
        name: body.name,
        code: body.code,
        branchId: body.branchId,
        version: body.version ? { increment: 1 } : undefined,
      },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.prisma.warehouse.delete({
      where: { id },
    });
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
