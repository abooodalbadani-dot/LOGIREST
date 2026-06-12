import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsArray,
  IsOptional,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'name_min_length' })
  name!: string;

  @IsEmail({}, { message: 'invalid_email' })
  @IsNotEmpty()
  email!: string;

  @IsEnum(Role)
  @IsNotEmpty()
  role!: Role;

  @IsEnum(['ACTIVE', 'INACTIVE'])
  @IsNotEmpty()
  status!: 'ACTIVE' | 'INACTIVE';

  @IsEnum(['en', 'ar'])
  @IsOptional()
  language?: 'en' | 'ar';

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  branchIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  warehouseIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  departmentIds?: string[];
}
