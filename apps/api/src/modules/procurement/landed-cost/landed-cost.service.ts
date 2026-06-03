import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class LandedCostService {
  private readonly logger = new Logger(LandedCostService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateVoucherNumber(): Promise<string> {
    const now = new Date();
    const yyyy = now.getFullYear().toString();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;

    const prefix = 'LCV';
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    const count = await this.prisma.landedCostVoucher.count({
      where: {
        createdAt: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}-${dateStr}-${seq}`;
  }

  async findById(id: string) {
    const voucher = await this.prisma.landedCostVoucher.findUnique({
      where: { id },
      include: {
        lines: true,
        grnRelations: {
          include: {
            grn: {
              include: {
                lines: {
                  include: {
                    item: true,
                    landedCostAllocations: true,
                  },
                },
              },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!voucher) {
      throw new NotFoundException(`LandedCostVoucher with ID ${id} not found`);
    }

    return voucher;
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.landedCostVoucher.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          grnRelations: {
            select: {
              grn: {
                select: {
                  id: true,
                  grnNumber: true,
                },
              },
            },
          },
          createdBy: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.landedCostVoucher.count(),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        page_size: limit,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async create(data: {
    allocationMethod: 'VALUE' | 'QUANTITY' | 'WEIGHT' | 'VOLUME';
    totalAllocatedCost: number;
    currencyId: string;
    exchangeRate: number;
    transactionDate: string;
    grnIds: string[];
    createdById: string;
    userRole: Role;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const voucherNumber = await this.generateVoucherNumber();

      for (const grnId of data.grnIds) {
        const grn = await tx.goodsReceivedNote.findUnique({
          where: { id: grnId },
          select: { id: true, warehouseId: true },
        });
        if (!grn) {
          throw new BadRequestException(`GRN with ID ${grnId} not found`);
        }

        if (data.userRole !== 'ADMIN') {
          const hasScope = await tx.userWarehouseScope.findUnique({
            where: {
              userId_warehouseId: {
                userId: data.createdById,
                warehouseId: grn.warehouseId,
              },
            },
          });
          if (!hasScope) {
            throw new ForbiddenException('WAREHOUSE_SCOPE_VIOLATION');
          }
        }
      }

      return tx.landedCostVoucher.create({
        data: {
          voucherNumber,
          allocationMethod: data.allocationMethod,
          totalAllocatedCost: data.totalAllocatedCost,
          currencyId: data.currencyId,
          exchangeRate: data.exchangeRate,
          transactionDate: new Date(data.transactionDate),
          createdById: data.createdById,
          grnRelations: {
            create: data.grnIds.map((grnId) => ({ grnId })),
          },
        },
        include: {
          lines: true,
          grnRelations: {
            include: {
              grn: {
                include: {
                  lines: {
                    include: { item: true },
                  },
                },
              },
            },
          },
        },
      });
    });
  }

  async update(
    id: string,
    data: {
      version: number;
      allocationMethod?: 'VALUE' | 'QUANTITY' | 'WEIGHT' | 'VOLUME';
      totalAllocatedCost?: number;
      grnIds?: string[];
      userId: string;
      role: Role;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.landedCostVoucher.findUnique({
        where: { id },
        select: {
          version: true,
          status: true,
          grnRelations: {
            include: {
              grn: {
                select: { id: true, warehouseId: true },
              },
            },
          },
        },
      });

      if (!existing) {
        throw new NotFoundException(
          `LandedCostVoucher with ID ${id} not found`,
        );
      }

      if (existing.version !== data.version) {
        throw new ConflictException(
          'Concurrency conflict: The voucher was modified by another user.',
        );
      }

      if (existing.status !== 'DRAFT') {
        throw new BadRequestException('Only DRAFT vouchers can be updated.');
      }

      if (data.role !== 'ADMIN') {
        const checkGrnIds = data.grnIds || existing.grnRelations.map((r) => r.grnId);
        for (const grnId of checkGrnIds) {
          const grn = await tx.goodsReceivedNote.findUnique({
            where: { id: grnId },
            select: { warehouseId: true },
          });
          if (grn) {
            const hasScope = await tx.userWarehouseScope.findUnique({
              where: {
                userId_warehouseId: {
                  userId: data.userId,
                  warehouseId: grn.warehouseId,
                },
              },
            });
            if (!hasScope) {
              throw new ForbiddenException('WAREHOUSE_SCOPE_VIOLATION');
            }
          }
        }
      }

      const updateData: any = {
        version: { increment: 1 },
      };

      if (data.allocationMethod)
        updateData.allocationMethod = data.allocationMethod;
      if (data.totalAllocatedCost !== undefined)
        updateData.totalAllocatedCost = data.totalAllocatedCost;

      if (data.grnIds) {
        await tx.landedCostGRNRelation.deleteMany({
          where: { landedCostVoucherId: id },
        });

        for (const grnId of data.grnIds) {
          const grn = await tx.goodsReceivedNote.findUnique({
            where: { id: grnId },
            select: { id: true },
          });
          if (!grn) {
            throw new BadRequestException(`GRN with ID ${grnId} not found`);
          }
        }

        updateData.grnRelations = {
          create: data.grnIds.map((grnId) => ({ grnId })),
        };
      }

      return tx.landedCostVoucher.update({
        where: { id },
        data: updateData,
        include: {
          lines: true,
          grnRelations: {
            include: {
              grn: {
                include: {
                  lines: {
                    include: { item: true },
                  },
                },
              },
            },
          },
        },
      });
    });
  }
}
