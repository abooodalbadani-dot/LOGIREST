import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  ValidateNested,
  IsArray,
  IsInt,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePoLineDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsString()
  @IsOptional()
  uomId?: string;

  @ValidateIf((_, v) => v !== null)
  @IsString()
  @IsOptional()
  notes?: string | null;
}

export class UpdatePoDto {
  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  currencyId?: string;

  @IsString()
  @IsOptional()
  targetWarehouseId?: string;

  @IsString()
  @IsOptional()
  warehouseId?: string;

  @IsNumber()
  @IsOptional()
  @Min(0.000001)
  @Type(() => Number)
  exchangeRate?: number;

  @ValidateIf((_, v) => v !== null)
  @IsString()
  @IsOptional()
  expectedDate?: string | null;

  @ValidateIf((_, v) => v !== null)
  @IsString()
  @IsOptional()
  notes?: string | null;

  @IsInt()
  @IsNotEmpty()
  version!: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdatePoLineDto)
  lines?: UpdatePoLineDto[];
}
