import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '@prisma/client';

export interface YieldBatch {
  id: string;
  recipeName: string;
  category: string;
  inputQty: number;
  outputQty: number;
  wasteQty: number;
  yieldPct: number;
  standardYield: number;
  efficiency: number;
  createdAt: string;
}

export interface CreateYieldBatchDto {
  recipeName: string;
  category: string;
  inputQty: number;
  outputQty: number;
  standardYield?: number;
  warehouseId?: string;
}

@Injectable()
export class YieldService {
  constructor(private readonly prisma: PrismaService) {}

  private mapToYieldBatch(dbBatch: {
    id: string;
    recipeName: string;
    category: string;
    inputQty: Prisma.Decimal;
    outputQty: Prisma.Decimal;
    wasteQty: Prisma.Decimal;
    yieldPct: Prisma.Decimal;
    standardYield: Prisma.Decimal;
    efficiency: Prisma.Decimal;
    createdAt: Date;
    warehouseId: string | null;
  }): YieldBatch {
    return {
      id: dbBatch.id,
      recipeName: dbBatch.recipeName,
      category: dbBatch.category,
      inputQty: Number(dbBatch.inputQty),
      outputQty: Number(dbBatch.outputQty),
      wasteQty: Number(dbBatch.wasteQty),
      yieldPct: Number(dbBatch.yieldPct),
      standardYield: Number(dbBatch.standardYield),
      efficiency: Number(dbBatch.efficiency),
      createdAt:
        dbBatch.createdAt instanceof Date
          ? dbBatch.createdAt.toISOString()
          : new Date(dbBatch.createdAt).toISOString(),
    };
  }

  async findAll(): Promise<YieldBatch[]> {
    const batches = await this.prisma.yieldBatch.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return batches.map((b) => this.mapToYieldBatch(b));
  }

  async findOne(id: string): Promise<YieldBatch> {
    const batch = await this.prisma.yieldBatch.findUnique({
      where: { id },
    });
    if (!batch) {
      throw new NotFoundException(`Yield batch with ID ${id} not found`);
    }
    return this.mapToYieldBatch(batch);
  }

  async create(body: CreateYieldBatchDto): Promise<YieldBatch> {
    const {
      recipeName,
      category,
      inputQty,
      outputQty,
      standardYield,
      warehouseId,
    } = body;

    if (
      !recipeName ||
      !category ||
      inputQty === undefined ||
      outputQty === undefined
    ) {
      throw new BadRequestException(
        'recipeName, category, inputQty, and outputQty are required',
      );
    }

    const input = Number(inputQty);
    const output = Number(outputQty);
    const stdYield = standardYield ? Number(standardYield) : 100.0;

    if (input <= 0) {
      throw new BadRequestException('inputQty must be greater than zero');
    }

    const waste = new Prisma.Decimal(input)
      .sub(new Prisma.Decimal(output))
      .toDecimalPlaces(4);
    const yieldPct = new Prisma.Decimal(output)
      .div(new Prisma.Decimal(input))
      .mul(100)
      .toDecimalPlaces(4);
    const efficiency = yieldPct
      .div(new Prisma.Decimal(stdYield))
      .mul(100)
      .toDecimalPlaces(4);

    const dbBatch = await this.prisma.yieldBatch.create({
      data: {
        recipeName,
        category,
        inputQty: input,
        outputQty: output,
        wasteQty: waste,
        yieldPct,
        standardYield: stdYield,
        efficiency,
        warehouseId: warehouseId || null,
      },
    });

    return this.mapToYieldBatch(dbBatch);
  }
}
