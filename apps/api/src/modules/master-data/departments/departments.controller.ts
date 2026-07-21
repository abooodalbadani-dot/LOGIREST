import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
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
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { AllRoles } from '../../../auth/decorators/all-roles.decorator';
import { Role } from '@prisma/client';
import type { Request } from 'express';

@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecureController()
export class DepartmentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @AllRoles()
  async findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query('branchId') branchId?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('search') search?: string,
  ) {
    const take = Math.min(limit ? parseInt(limit, 10) : 20, 50);
    const pageNum = page ? parseInt(page, 10) : 1;
    const skip = (pageNum - 1) * take;

    const where: Record<string, unknown> = branchId ? { branchId } : {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role !== 'ADMIN') {
      where.branch = {
        warehouses: {
          some: {
            userScopes: {
              some: {
                userId,
              },
            },
          },
        },
      };
    }

    const [departments, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        orderBy: { name: 'asc' },
        take,
        skip,
        select: {
          id: true,
          name: true,
          branchId: true,
          version: true,
          branch: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.department.count({ where }),
    ]);

    const limitNum = take || total || 1;

    return {
      data: departments.map((d) => ({
        ...d,
        code: d.name.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
      })),
      meta: {
        total,
        page: pageNum,
        pageSize: limitNum,
        totalPages: take ? Math.ceil(total / take) : 1,
      },
    };
  }

  @Get(':id')
  @AllRoles()
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    if (role !== Role.ADMIN) {
      const dept = await this.prisma.department.findUnique({
        where: { id },
        select: { branchId: true },
      });
      if (!dept) {
        throw new NotFoundException(`Department with ID ${id} not found`);
      }
      const hasScope = await this.prisma.userWarehouseScope.findFirst({
        where: {
          userId,
          warehouse: {
            branchId: dept.branchId,
          },
        },
      });
      if (!hasScope) {
        throw new ForbiddenException(
          'Access to this department is not allowed.',
        );
      }
    }

    const department = await this.prisma.department.findUnique({
      where: { id },
      include: { branch: true },
    });
    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
    return {
      ...department,
      code: department.name.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
    };
  }

  @Post()
  @Roles(Role.ADMIN)
  async create(
    @Body() body: CreateDepartmentDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const { name, branchId, isActive } = body;
    if (!name || !branchId) {
      throw new BadRequestException('name and branchId are required');
    }

    const department = await this.prisma.$transaction(async (tx) => {
      const created = await tx.department.create({
        data: {
          name,
          branchId,
          isActive: isActive !== undefined ? isActive : true,
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
          action: 'DEPARTMENT_CREATED',
          targetTable: 'departments',
          targetId: created.id,
          beforeStateJson: '',
          afterStateJson: JSON.stringify({
            name,
            branchId,
            isActive: created.isActive,
          }),
          ipAddress: ipAddress || null,
        },
      });

      return created;
    });

    return {
      ...department,
      code: department.name.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
    };
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateDepartmentDto,
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
          isActive: body.isActive !== undefined ? body.isActive : undefined,
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

    return {
      ...updated,
      code: updated.name.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
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
