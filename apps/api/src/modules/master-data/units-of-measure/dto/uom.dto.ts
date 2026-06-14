import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateUomDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  code?: string;
}

export class UpdateUomDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsNumber()
  @IsOptional()
  version?: number;
}
