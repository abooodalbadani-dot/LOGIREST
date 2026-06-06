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

export class UpdateGrnLineDto {
  @IsString()
  @IsOptional()
  id?: string;

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

export class UpdateGrnDto {
  @IsString()
  @IsOptional()
  poId?: string;

  @IsString()
  @IsOptional()
  warehouseId?: string;

  @IsString()
  @IsOptional()
  currencyId?: string;

  @IsInt()
  @IsNotEmpty()
  version!: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateGrnLineDto)
  lines?: UpdateGrnLineDto[];
}
