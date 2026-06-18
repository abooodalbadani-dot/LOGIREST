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

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateGrnLineDto)
  lineItems?: UpdateGrnLineDto[];
}
