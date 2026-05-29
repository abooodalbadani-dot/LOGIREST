import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

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
  private batches: YieldBatch[] = [
    {
      id: 'yield-1',
      recipe_name: 'Beef Stroganoff Prep',
      category: 'protein',
      input_qty: 15.0,
      output_qty: 12.6,
      waste_qty: 2.4,
      yield_pct: 84.0,
      standard_yield: 85.0,
      efficiency: 98.8,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'yield-2',
      recipe_name: 'Diced Tomatoes Prep',
      category: 'produce',
      input_qty: 10.0,
      output_qty: 9.1,
      waste_qty: 0.9,
      yield_pct: 91.0,
      standard_yield: 90.0,
      efficiency: 101.1,
      created_at: new Date().toISOString(),
    },
  ];

  findAll() {
    return this.batches;
  }

  findOne(id: string) {
    const batch = this.batches.find(b => b.id === id);
    if (!batch) {
      throw new NotFoundException(`Yield batch with ID ${id} not found`);
    }
    return batch;
  }

  create(body: any) {
    const { recipe_name, category, input_qty, output_qty, standard_yield } = body;

    if (!recipe_name || !category || input_qty === undefined || output_qty === undefined) {
      throw new BadRequestException('recipe_name, category, input_qty, and output_qty are required');
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

    const newBatch: YieldBatch = {
      id: `yield-${Date.now()}`,
      recipe_name,
      category,
      input_qty: input,
      output_qty: output,
      waste_qty: waste,
      yield_pct: yieldPct,
      standard_yield: stdYield,
      efficiency,
      created_at: new Date().toISOString(),
    };

    this.batches.push(newBatch);
    return newBatch;
  }
}
