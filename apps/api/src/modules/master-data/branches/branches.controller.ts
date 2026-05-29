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

@Controller('branches')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class BranchesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('limit') limit?: string) {
    const take = limit ? parseInt(limit, 10) : undefined;
    const branches = await this.prisma.branch.findMany({
      take,
      orderBy: { name: 'asc' },
    });
    return {
      data: branches,
      meta: {
        total: branches.length,
        page: 1,
        page_size: take || branches.length,
        total_pages: 1,
      },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }
    return branch;
  }

  @Post()
  async create(@Body() body: any) {
    return this.prisma.branch.create({
      data: {
        name: body.name,
        code: body.code,
      },
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.prisma.branch.update({
      where: { id },
      data: {
        name: body.name,
        code: body.code,
        version: body.version ? { increment: 1 } : undefined,
      },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.prisma.branch.delete({
      where: { id },
    });
  }
}
