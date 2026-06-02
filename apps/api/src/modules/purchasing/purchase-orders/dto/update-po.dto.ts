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

export class UpdatePoLineDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class UpdatePoDto {
  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  currencyId?: string;

  @IsInt()
  @IsNotEmpty()
  version!: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdatePoLineDto)
  lines?: UpdatePoLineDto[];
}
