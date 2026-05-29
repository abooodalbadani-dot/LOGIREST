import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

@Controller('departments')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class DepartmentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(
    @Query('branch_id') branchId?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const take = limit ? Math.min(parseInt(limit, 10), 500) : undefined;
    const skip = page && take ? (parseInt(page, 10) - 1) * take : undefined;

    const departments = await this.prisma.department.findMany({
      where: branchId ? { branchId } : {},
      orderBy: { name: 'asc' },
      ...(take ? { take } : {}),
      ...(skip ? { skip } : {}),
      include: { branch: true },
    });

    return departments;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: { branch: true },
    });
    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
    return department;
  }

  @Post()
  async create(
    @Body() body: { name: string; branchId: string },
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const { name, branchId } = body;
    if (!name || !branchId) {
      throw new BadRequestException('name and branchId are required');
    }

    const department = await this.prisma.$transaction(async (tx) => {
      const created = await tx.department.create({
        data: { name, branchId },
        include: { branch: true },
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
          action: 'DEPARTMENT_CREATED',
          targetTable: 'departments',
          targetId: created.id,
          beforeStateJson: '',
          afterStateJson: JSON.stringify({ name, branchId }),
          ipAddress: ipAddress || null,
        },
      });

      return created;
    });

    return department;
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; branchId?: string; version?: number },
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const existing = await this.prisma.department.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.department.update({
        where: { id },
        data: {
          ...(body.name ? { name: body.name } : {}),
          ...(body.branchId ? { branchId: body.branchId } : {}),
          version: existing.version + 1,
        },
        include: { branch: true },
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
          action: 'DEPARTMENT_UPDATED',
          targetTable: 'departments',
          targetId: id,
          beforeStateJson: JSON.stringify(existing),
          afterStateJson: JSON.stringify(res),
          ipAddress: ipAddress || null,
        },
      });

      return res;
    });

    return updated;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        inventoryIssues: { take: 1 },
        kitchenRequests: { take: 1 },
      },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    if (
      department.inventoryIssues.length > 0 ||
      department.kitchenRequests.length > 0
    ) {
      throw new BadRequestException(
        'Cannot delete department with active issues or kitchen requests',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.department.delete({ where: { id } });

      const ipAddress =
        (Array.isArray(req.headers['x-forwarded-for'])
          ? req.headers['x-forwarded-for'][0]
          : req.headers['x-forwarded-for']) ||
        req.ip ||
        undefined;

      await tx.auditLog.create({
        data: {
          userId,
          action: 'DEPARTMENT_DELETED',
          targetTable: 'departments',
          targetId: id,
          beforeStateJson: JSON.stringify(department),
          afterStateJson: '',
          ipAddress: ipAddress || null,
        },
      });
    });

    return { success: true };
  }
}
