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

export class GrnLineDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsString()
  @IsOptional()
  lotId?: string | null;

  @IsNumber()
  @Min(0)
  receivedQty!: number;

  @IsNumber()
  @Min(0)
  unitCostForeign!: number;
}

export class CreateGrnDto {
  @IsString()
  @IsNotEmpty()
  poId!: string;

  @IsString()
  @IsNotEmpty()
  warehouseId!: string;

  @IsString()
  @IsOptional()
  currencyId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GrnLineDto)
  lines!: GrnLineDto[];
}
