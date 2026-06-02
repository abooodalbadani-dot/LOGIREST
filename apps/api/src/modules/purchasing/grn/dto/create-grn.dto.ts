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
  @IsOptional()
  item_id?: string;

  @IsString()
  @IsOptional()
  itemId?: string;

  @IsString()
  @IsOptional()
  lot_id?: string | null;

  @IsString()
  @IsOptional()
  lotId?: string | null;

  @IsNumber()
  @IsOptional()
  qty?: number;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @IsOptional()
  received_qty?: number;

  @IsNumber()
  @IsOptional()
  unit_cost_foreign?: number;

  @IsNumber()
  @IsOptional()
  unitPrice?: number;
}

export class CreateGrnDto {
  @IsString()
  @IsOptional()
  po_id?: string;

  @IsString()
  @IsOptional()
  poId?: string;

  @IsString()
  @IsOptional()
  warehouse_id?: string;

  @IsString()
  @IsOptional()
  warehouseId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GrnLineDto)
  lines!: GrnLineDto[];
}
