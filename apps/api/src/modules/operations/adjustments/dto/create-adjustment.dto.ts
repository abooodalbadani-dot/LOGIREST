import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, ValidateNested, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AdjustmentDirection, AdjustmentReason } from '@prisma/client';

export class CreateAdjustmentLineDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsOptional()
  @IsString()
  lotId?: string;

  @IsNumber()
  @Min(0.0001)
  @Type(() => Number)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  qty?: number;

  @IsOptional()
  @IsString()
  uomId?: string;

  @IsEnum(AdjustmentDirection)
  direction!: AdjustmentDirection;

  @IsEnum(AdjustmentReason)
  reason!: AdjustmentReason;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitCost?: number;
}

export class CreateAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  warehouseId!: string;

  @IsOptional()
  @IsEnum(AdjustmentReason)
  reason?: AdjustmentReason;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAdjustmentLineDto)
  lines!: CreateAdjustmentLineDto[];
}
