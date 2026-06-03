import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../database/prisma.service';
import { LandedCostCalculatorService } from './landed-cost-calculator.service';
import { Role } from '@prisma/client';

@Injectable()
export class LandedCostPostService {
  private readonly logger = new Logger(LandedCostPostService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: LandedCostCalculatorService,
    @InjectQueue('landed-cost-revaluation')
    private readonly revaluationQueue: Queue,
  ) {}

  async post(voucherId: string, userId: string, role: Role) {
    const voucher = await this.prisma.landedCostVoucher.findUnique({
      where: { id: voucherId },
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

    if (!voucher) {
      throw new BadRequestException(
        `LandedCostVoucher with ID ${voucherId} not found`,
      );
    }

    if (role !== 'ADMIN') {
      for (const rel of voucher.grnRelations) {
        const hasScope = await this.prisma.userWarehouseScope.findUnique({
          where: {
            userId_warehouseId: {
              userId,
              warehouseId: rel.grn.warehouseId,
            },
          },
        });
        if (!hasScope) {
          throw new ForbiddenException('WAREHOUSE_SCOPE_VIOLATION');
        }
      }
    }

    if (voucher.status !== 'DRAFT') {
      throw new BadRequestException(
        `Voucher ${voucherId} is not in DRAFT status`,
      );
    }

    const allGrnLines = voucher.grnRelations.flatMap((rel) =>
      rel.grn.lines.map((line) => ({
        grnLineId: line.id,
        quantity: Number(line.quantityReceived),
        unitPrice: Number(line.unitPrice),
        itemId: line.itemId,
      })),
    );

    if (!allGrnLines.length) {
      throw new BadRequestException('No GRN lines found to allocate costs to');
    }

    const calculations = this.calculator.calculate(
      allGrnLines,
      Number(voucher.totalAllocatedCost),
      voucher.allocationMethod,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.landedCostAllocationLine.deleteMany({
        where: { landedCostVoucherId: voucherId },
      });

      await tx.landedCostAllocationLine.createMany({
        data: calculations.map((calc) => ({
          landedCostVoucherId: voucherId,
          grnLineId: calc.grnLineId,
          allocatedCost: calc.allocatedCost,
          adjustedUnitCost: calc.adjustedUnitCost,
        })),
      });

      return tx.landedCostVoucher.update({
        where: { id: voucherId },
        data: {
          status: 'PROCESSING',
          version: { increment: 1 },
        },
        include: {
          lines: true,
          grnRelations: {
            include: {
              grn: {
                include: { lines: { include: { item: true } } },
              },
            },
          },
        },
      });
    });

    await this.revaluationQueue.add(
      'revaluate',
      { voucherId },
      {
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );

    this.logger.log(`Dispatched revaluation job for voucher ${voucherId}`);

    return updated;
  }
}
