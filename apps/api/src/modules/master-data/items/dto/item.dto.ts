import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UomConversionDto {
  @IsString()
  @IsOptional()
  fromUomId?: string;

  @IsString()
  @IsOptional()
  from_uom_id?: string;

  @IsString()
  @IsOptional()
  toUomId?: string;

  @IsString()
  @IsOptional()
  to_uom_id?: string;

  @IsNumber()
  @Type(() => Number)
  factor!: number;
}

export class ItemBarcodeDto {
  @IsString()
  @IsNotEmpty()
  barcode!: string;

  @IsString()
  @IsOptional()
  uomId?: string;

  @IsString()
  @IsOptional()
  uom_id?: string;
}

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

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ItemBarcodeDto)
  barcodes?: ItemBarcodeDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ItemBarcodeDto)
  barcode_mappings?: ItemBarcodeDto[];

  @IsString()
  @IsOptional()
  image?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UomConversionDto)
  uomConversions?: UomConversionDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UomConversionDto)
  uom_conversions?: UomConversionDto[];
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

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ItemBarcodeDto)
  barcodes?: ItemBarcodeDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ItemBarcodeDto)
  barcode_mappings?: ItemBarcodeDto[];

  @IsString()
  @IsOptional()
  image?: string;

  @IsNumber()
  @IsOptional()
  version?: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UomConversionDto)
  uomConversions?: UomConversionDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UomConversionDto)
  uom_conversions?: UomConversionDto[];
}
