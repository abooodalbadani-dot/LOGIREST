import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  ValidateNested,
  IsArray,
  IsInt,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PoLineDto {
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

export class CreatePoDto {
  @IsString()
  @IsNotEmpty()
  supplierId!: string;

  @IsString()
  @IsNotEmpty()
  currencyId!: string;

  @IsString()
  @IsOptional()
  prId?: string;

  @IsString()
  @IsOptional()
  targetWarehouseId?: string;

  @IsString()
  @IsOptional()
  warehouseId?: string;

  @IsBoolean()
  @IsOptional()
  isSubmitted?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0.000001)
  @Type(() => Number)
  exchangeRate?: number;

  @ValidateIf((_, v) => v !== null)
  @IsString()
  @IsOptional()
  notes?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PoLineDto)
  lines!: PoLineDto[];
}
