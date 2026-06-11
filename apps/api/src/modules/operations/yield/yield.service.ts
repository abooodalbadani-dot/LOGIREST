import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

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
    inputQty: number;
    outputQty: number;
    wasteQty: number;
    yieldPct: number;
    standardYield: number;
    efficiency: number;
    createdAt: Date;
    warehouseId: string | null;
  }): YieldBatch {
    return {
      id: dbBatch.id,
      recipeName: dbBatch.recipeName,
      category: dbBatch.category,
      inputQty: dbBatch.inputQty,
      outputQty: dbBatch.outputQty,
      wasteQty: dbBatch.wasteQty,
      yieldPct: dbBatch.yieldPct,
      standardYield: dbBatch.standardYield,
      efficiency: dbBatch.efficiency,
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

    const waste = parseFloat((input - output).toFixed(4));
    const yieldPct = parseFloat(((output / input) * 100).toFixed(2));
    const efficiency = parseFloat(((yieldPct / stdYield) * 100).toFixed(2));

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
