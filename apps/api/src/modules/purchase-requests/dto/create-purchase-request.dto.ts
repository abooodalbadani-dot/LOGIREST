import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PrLineDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsString()
  @IsOptional()
  uomId?: string;
}

export class CreatePurchaseRequestDto {
  @IsString()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  warehouseId!: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrLineDto)
  lines!: PrLineDto[];
}
