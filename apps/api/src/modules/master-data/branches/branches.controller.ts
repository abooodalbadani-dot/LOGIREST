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
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { ApiSecureController } from '../../../decorators/swagger-docs.decorator';
import type { Request } from 'express';

@Controller('branches')
@ApiSecureController()
export class BranchesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    const take = limit ? Math.min(parseInt(limit, 10), 500) : undefined;
    const skip = page && take ? (parseInt(page, 10) - 1) * take : undefined;

    const branches = await this.prisma.branch.findMany({
      orderBy: { name: 'asc' },
      ...(take ? { take } : {}),
      ...(skip ? { skip } : {}),
      include: { warehouses: true },
    });

    return branches;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
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
    @Body() body: { name: string; code: string },
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const { name, code } = body;
    if (!name || !code) {
      throw new BadRequestException('name and code are required');
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
    @Req() req: Request,
  ) {
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
    @Req() req: Request,
  ) {
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
