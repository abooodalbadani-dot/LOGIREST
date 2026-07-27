import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  ValidateNested,
  IsArray,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LotAllocationDto {
  @IsString()
  @IsNotEmpty()
  lotId!: string;

  @IsNumber()
  @Min(0)
  quantityAllocated!: number;

  @IsString()
  @IsOptional()
  lotNumber?: string | null;

  @IsString()
  @IsOptional()
  expiryDate?: string | null;
}

export class GrnLineDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsString()
  @IsOptional()
  uomId?: string | null;

  @IsString()
  @IsOptional()
  lotId?: string | null;

  @IsString()
  @IsOptional()
  lotNumber?: string | null;

  @IsString()
  @IsOptional()
  expiryDate?: string | null;

  @IsNumber()
  @Min(0)
  receivedQty!: number;

  @IsNumber()
  @Min(0)
  unitCostForeign!: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LotAllocationDto)
  lotAllocations?: LotAllocationDto[];
}

export class CreateGrnDto {
  @IsString()
  @IsOptional()
  poId?: string | null;

  @IsString()
  @IsOptional()
  supplierId?: string | null;

  @IsString()
  @IsOptional()
  currencyId?: string | null;

  @IsString()
  @IsNotEmpty()
  warehouseId!: string;

  @IsNumber()
  @IsOptional()
  fxRate?: number | null;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => GrnLineDto)
  lines?: GrnLineDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => GrnLineDto)
  lineItems?: GrnLineDto[];
}
