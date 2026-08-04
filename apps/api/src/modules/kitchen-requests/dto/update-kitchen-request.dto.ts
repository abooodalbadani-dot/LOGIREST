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
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  itemId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  quantityRequested?: number;

  @IsOptional()
  @IsString()
  uomId?: string;

  @IsOptional()
  @IsString()
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
