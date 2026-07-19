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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PoLineDto)
  lines!: PoLineDto[];
}
