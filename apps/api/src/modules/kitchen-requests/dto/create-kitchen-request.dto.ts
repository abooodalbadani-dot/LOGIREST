import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateKitchenRequestItemDto {
  @IsString()
  itemId!: string;

  @IsNumber()
  @Min(0.0001)
  quantityRequested!: number;

  @IsString()
  @IsOptional()
  uomId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateKitchenRequestDto {
  @IsString()
  departmentId!: string;

  @IsString()
  warehouseId!: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateKitchenRequestItemDto)
  items!: CreateKitchenRequestItemDto[];
}
