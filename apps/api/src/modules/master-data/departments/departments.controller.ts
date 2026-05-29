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

@Controller('departments')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class DepartmentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(
    @Query('branch_id') branchId?: string,
    @Query('limit') limit?: string,
  ) {
    const take = limit ? parseInt(limit, 10) : undefined;
    const filter = branchId ? { branchId } : {};
    const departments = await this.prisma.department.findMany({
      where: filter,
      take,
      orderBy: { name: 'asc' },
    });
    return {
      data: departments,
      meta: {
        total: departments.length,
        page: 1,
        page_size: take || departments.length,
        total_pages: 1,
      },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });
    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
    return department;
  }

  @Post()
  async create(@Body() body: any) {
    return this.prisma.department.create({
      data: {
        name: body.name,
        branchId: body.branchId,
      },
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.prisma.department.update({
      where: { id },
      data: {
        name: body.name,
        branchId: body.branchId,
        version: body.version ? { increment: 1 } : undefined,
      },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.prisma.department.delete({
      where: { id },
    });
  }
}
