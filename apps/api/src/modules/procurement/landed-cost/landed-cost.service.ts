import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Role, Prisma } from '@prisma/client';
import { DocumentNumberService } from '../../sequencing/document-number.service';

@Injectable()
export class LandedCostService {
  private readonly logger = new Logger(LandedCostService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentNumberService: DocumentNumberService,
  ) {}

  async generateVoucherNumber(
    tx: Prisma.TransactionClient,
    branchId: string,
  ): Promise<string> {
    return this.documentNumberService.next(tx, 'LANDED_COST_VOUCHER', branchId);
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
        pageSize: limit,
        totalPages: Math.ceil(total / limit) || 1,
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
      // Get branchId from the first GRN
      if (!data.grnIds || data.grnIds.length === 0) {
        throw new BadRequestException('At least one GRN must be selected');
      }

      const firstGrn = await tx.goodsReceivedNote.findUnique({
        where: { id: data.grnIds[0] },
        include: { warehouse: true },
      });

      if (!firstGrn || !firstGrn.warehouse) {
        throw new BadRequestException(
          'Valid GRN with a warehouse is required to generate voucher number',
        );
      }

      const voucherNumber = await this.generateVoucherNumber(
        tx,
        firstGrn.warehouse.branchId,
      );

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
        const checkGrnIds =
          data.grnIds || existing.grnRelations.map((r) => r.grnId);
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

      const updateData: Prisma.LandedCostVoucherUpdateInput = {
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
