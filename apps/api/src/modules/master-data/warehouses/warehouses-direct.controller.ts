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
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';

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
}
