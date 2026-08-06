import { IsOptional, IsEnum, IsString, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { POStatus } from '@prisma/client';

export class FindPurchaseOrdersDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') return value.split(',').map((s) => s.trim());
    return value;
  })
  @IsArray()
  @IsEnum(POStatus, { each: true })
  status?: POStatus[];

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
