import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateKitchenRequestItemDto {
  @IsString()
  itemId!: string;

  @IsNumber()
  @IsOptional()
  @Min(0.0001)
  quantity?: number;

  @IsNumber()
  @IsOptional()
  @Min(0.0001)
  quantityRequested?: number;

  @IsString()
  @IsOptional()
  uomId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateKitchenRequestDto {
  @IsNumber()
  version!: number;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  warehouseId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateKitchenRequestItemDto)
  items?: UpdateKitchenRequestItemDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateKitchenRequestItemDto)
  lines?: UpdateKitchenRequestItemDto[];
}
