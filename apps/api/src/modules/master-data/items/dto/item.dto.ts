import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  primaryUomId!: string;

  @IsBoolean()
  @IsOptional()
  trackLots?: boolean;

  @IsNumber()
  @IsOptional()
  minStockLevel?: number;

  @IsNumber()
  @IsOptional()
  reorderPoint?: number;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsString()
  @IsOptional()
  image?: string;
}

export class UpdateItemDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  primaryUomId?: string;

  @IsBoolean()
  @IsOptional()
  trackLots?: boolean;

  @IsNumber()
  @IsOptional()
  minStockLevel?: number;

  @IsNumber()
  @IsOptional()
  reorderPoint?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsNumber()
  @IsOptional()
  version?: number;
}
