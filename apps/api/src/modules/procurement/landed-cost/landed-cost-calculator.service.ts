import { Injectable } from '@nestjs/common';

export interface AllocationLineInput {
  grnLineId: string;
  quantity: number;
  unitPrice: number;
  itemId?: string;
  weight?: number;
  volume?: number;
}

export interface AllocationResult {
  grnLineId: string;
  allocatedCost: number;
  adjustedUnitCost: number;
}

@Injectable()
export class LandedCostCalculatorService {
  calculate(
    lines: AllocationLineInput[],
    totalCost: number,
    method: 'VALUE' | 'QUANTITY' | 'WEIGHT' | 'VOLUME',
  ): AllocationResult[] {
    if (!lines.length || totalCost <= 0) {
      return lines.map((line) => ({
        grnLineId: line.grnLineId,
        allocatedCost: 0,
        adjustedUnitCost: line.unitPrice,
      }));
    }

    switch (method) {
      case 'VALUE':
        return this.calculateByValue(lines, totalCost);
      case 'QUANTITY':
        return this.calculateByQuantity(lines, totalCost);
      case 'WEIGHT':
        return this.calculateByWeight(lines, totalCost);
      case 'VOLUME':
        return this.calculateByVolume(lines, totalCost);
      default:
        return this.calculateByValue(lines, totalCost);
    }
  }

  private calculateByValue(
    lines: AllocationLineInput[],
    totalCost: number,
  ): AllocationResult[] {
    const totalValue = lines.reduce(
      (sum, line) => sum + line.quantity * line.unitPrice,
      0,
    );

    if (totalValue <= 0) {
      return this.evenSplit(lines, totalCost);
    }

    return lines.map((line) => {
      const lineValue = line.quantity * line.unitPrice;
      const proportion = lineValue / totalValue;
      const allocatedCost = Math.round(proportion * totalCost * 10000) / 10000;
      const adjustedUnitCost =
        Math.round((line.unitPrice + allocatedCost / line.quantity) * 10000) /
        10000;

      return {
        grnLineId: line.grnLineId,
        allocatedCost,
        adjustedUnitCost,
      };
    });
  }

  private calculateByQuantity(
    lines: AllocationLineInput[],
    totalCost: number,
  ): AllocationResult[] {
    const totalQty = lines.reduce((sum, line) => sum + line.quantity, 0);

    if (totalQty <= 0) {
      return this.evenSplit(lines, totalCost);
    }

    return lines.map((line) => {
      const proportion = line.quantity / totalQty;
      const allocatedCost = Math.round(proportion * totalCost * 10000) / 10000;
      const adjustedUnitCost =
        Math.round((line.unitPrice + allocatedCost / line.quantity) * 10000) /
        10000;

      return {
        grnLineId: line.grnLineId,
        allocatedCost,
        adjustedUnitCost,
      };
    });
  }

  private calculateByWeight(
    lines: AllocationLineInput[],
    totalCost: number,
  ): AllocationResult[] {
    const totalWeight = lines.reduce(
      (sum, line) => sum + (line.weight || 0),
      0,
    );

    if (totalWeight <= 0) {
      return this.calculateByValue(lines, totalCost);
    }

    return lines.map((line) => {
      const proportion = (line.weight || 0) / totalWeight;
      const allocatedCost = Math.round(proportion * totalCost * 10000) / 10000;
      const adjustedUnitCost =
        Math.round((line.unitPrice + allocatedCost / line.quantity) * 10000) /
        10000;

      return {
        grnLineId: line.grnLineId,
        allocatedCost,
        adjustedUnitCost,
      };
    });
  }

  private calculateByVolume(
    lines: AllocationLineInput[],
    totalCost: number,
  ): AllocationResult[] {
    const totalVolume = lines.reduce(
      (sum, line) => sum + (line.volume || 0),
      0,
    );

    if (totalVolume <= 0) {
      return this.calculateByValue(lines, totalCost);
    }

    return lines.map((line) => {
      const proportion = (line.volume || 0) / totalVolume;
      const allocatedCost = Math.round(proportion * totalCost * 10000) / 10000;
      const adjustedUnitCost =
        Math.round((line.unitPrice + allocatedCost / line.quantity) * 10000) /
        10000;

      return {
        grnLineId: line.grnLineId,
        allocatedCost,
        adjustedUnitCost,
      };
    });
  }

  private evenSplit(
    lines: AllocationLineInput[],
    totalCost: number,
  ): AllocationResult[] {
    const perLine = Math.round((totalCost / lines.length) * 10000) / 10000;
    return lines.map((line) => ({
      grnLineId: line.grnLineId,
      allocatedCost: perLine,
      adjustedUnitCost:
        Math.round((line.unitPrice + perLine / line.quantity) * 10000) / 10000,
    }));
  }
}
