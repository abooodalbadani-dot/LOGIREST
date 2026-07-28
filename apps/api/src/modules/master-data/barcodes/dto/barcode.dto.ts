import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateBarcodeDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsOptional()
  @IsString()
  uomId?: string;
}

export class UpdateBarcodeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  itemId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsOptional()
  @IsString()
  uomId?: string;

  @IsOptional()
  @IsNumber()
  version?: number;
}
