import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

export interface YieldBatch {
  id: string;
  recipe_name: string;
  category: string;
  input_qty: number;
  output_qty: number;
  waste_qty: number;
  yield_pct: number;
  standard_yield: number;
  efficiency: number;
  created_at: string;
}

@Injectable()
export class YieldService {
  constructor(private readonly prisma: PrismaService) {}

  private mapToYieldBatch(dbBatch: any): YieldBatch {
    return {
      id: dbBatch.id,
      recipe_name: dbBatch.recipeName,
      category: dbBatch.category,
      input_qty: dbBatch.inputQty,
      output_qty: dbBatch.outputQty,
      waste_qty: dbBatch.wasteQty,
      yield_pct: dbBatch.yieldPct,
      standard_yield: dbBatch.standardYield,
      efficiency: dbBatch.efficiency,
      created_at:
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

  async create(body: any): Promise<YieldBatch> {
    const recipe_name = body.recipe_name || body.recipeName;
    const category = body.category;
    const input_qty =
      body.input_qty !== undefined ? body.input_qty : body.inputQty;
    const output_qty =
      body.output_qty !== undefined ? body.output_qty : body.outputQty;
    const standard_yield =
      body.standard_yield !== undefined
        ? body.standard_yield
        : body.standardYield;
    const warehouse_id = body.warehouse_id || body.warehouseId;

    if (
      !recipe_name ||
      !category ||
      input_qty === undefined ||
      output_qty === undefined
    ) {
      throw new BadRequestException(
        'recipe_name, category, input_qty, and output_qty are required',
      );
    }

    const input = parseFloat(input_qty);
    const output = parseFloat(output_qty);
    const stdYield = standard_yield ? parseFloat(standard_yield) : 100.0;

    if (input <= 0) {
      throw new BadRequestException('input_qty must be greater than zero');
    }

    const waste = parseFloat((input - output).toFixed(4));
    const yieldPct = parseFloat(((output / input) * 100).toFixed(2));
    const efficiency = parseFloat(((yieldPct / stdYield) * 100).toFixed(2));

    const dbBatch = await this.prisma.yieldBatch.create({
      data: {
        recipeName: recipe_name,
        category,
        inputQty: input,
        outputQty: output,
        wasteQty: waste,
        yieldPct,
        standardYield: stdYield,
        efficiency,
        warehouseId: warehouse_id || null,
      },
    });

    return this.mapToYieldBatch(dbBatch);
  }
}
