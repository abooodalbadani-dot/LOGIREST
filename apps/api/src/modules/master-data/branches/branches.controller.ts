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
import { Role } from '@prisma/client';
import type { Request } from 'express';

@Controller('branches')
@UseGuards(JwtAuthGuard)
@ApiSecureController()
export class BranchesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    const take = limit ? Math.min(parseInt(limit, 10), 500) : undefined;
    const skip = page && take ? (parseInt(page, 10) - 1) * take : undefined;

    const where: any = {};
    if (role !== 'ADMIN') {
      where.warehouses = {
        some: {
          userScopes: {
            some: {
              userId,
            },
          },
        },
      };
    }

    const branches = await this.prisma.branch.findMany({
      where,
      orderBy: { name: 'asc' },
      ...(take ? { take } : {}),
      ...(skip ? { skip } : {}),
      include: { warehouses: true },
    });

    const total = await this.prisma.branch.count({ where });
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = take || total || 1;

    return {
      data: branches,
      meta: {
        total,
        page: pageNum,
        page_size: limitNum,
        total_pages: take ? Math.ceil(total / take) : 1,
      },
    };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    if (role !== Role.ADMIN) {
      const hasScope = await this.prisma.userWarehouseScope.findFirst({
        where: {
          userId,
          warehouse: {
            branchId: id,
          },
        },
      });
      if (!hasScope) {
        throw new ForbiddenException('Access to this branch is not allowed.');
      }
    }

    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: { warehouses: true, departments: true },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }
    return branch;
  }

  @Post()
  async create(
    @Body() body: { name: string; code?: string },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Req() req: Request,
  ) {
    if (role !== Role.ADMIN && role !== Role.GM) {
      throw new ForbiddenException(
        'Only ADMIN or GM roles are authorized to modify master data.',
      );
    }
    const { name } = body;
    let { code } = body;
    if (!name) {
      throw new BadRequestException('name is required');
    }

    if (!code || code.trim() === '') {
      const allBranches = await this.prisma.branch.findMany({
        where: {
          code: {
            startsWith: 'BR-',
          },
        },
        select: {
          code: true,
        },
      });
      let maxNum = 0;
      for (const b of allBranches) {
        const matches = b.code.match(/^BR-(\d+)$/);
        if (matches) {
          const num = parseInt(matches[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
      code = `BR-${String(maxNum + 1).padStart(4, '0')}`;
    }

    const branch = await this.prisma.$transaction(async (tx) => {
      const created = await tx.branch.create({ data: { name, code } });

      const ipAddress =
        (Array.isArray(req.headers['x-forwarded-for'])
          ? req.headers['x-forwarded-for'][0]
          : req.headers['x-forwarded-for']) ||
        req.ip ||
        undefined;

      await tx.auditLog.create({
        data: {
          userId,
          action: 'BRANCH_CREATED',
          targetTable: 'branches',
          targetId: created.id,
          beforeStateJson: '',
          afterStateJson: JSON.stringify({ name, code }),
          ipAddress: ipAddress || null,
        },
      });

      return created;
    });

    return branch;
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; code?: string; version?: number },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Req() req: Request,
  ) {
    if (role !== Role.ADMIN && role !== Role.GM) {
      throw new ForbiddenException(
        'Only ADMIN or GM roles are authorized to modify master data.',
      );
    }
    const existing = await this.prisma.branch.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.branch.update({
        where: { id },
        data: {
          ...(body.name ? { name: body.name } : {}),
          ...(body.code ? { code: body.code } : {}),
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
          action: 'BRANCH_UPDATED',
          targetTable: 'branches',
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
    @CurrentUser('role') role: Role,
    @Req() req: Request,
  ) {
    if (role !== Role.ADMIN && role !== Role.GM) {
      throw new ForbiddenException(
        'Only ADMIN or GM roles are authorized to modify master data.',
      );
    }
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: { warehouses: { where: { isActive: true } } },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }

    if (branch.warehouses.length > 0) {
      throw new BadRequestException(
        'Cannot delete branch with active warehouses',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.branch.delete({ where: { id } });

      const ipAddress =
        (Array.isArray(req.headers['x-forwarded-for'])
          ? req.headers['x-forwarded-for'][0]
          : req.headers['x-forwarded-for']) ||
        req.ip ||
        undefined;

      await tx.auditLog.create({
        data: {
          userId,
          action: 'BRANCH_DELETED',
          targetTable: 'branches',
          targetId: id,
          beforeStateJson: JSON.stringify(branch),
          afterStateJson: '',
          ipAddress: ipAddress || null,
        },
      });
    });

    return { success: true };
  }
}
