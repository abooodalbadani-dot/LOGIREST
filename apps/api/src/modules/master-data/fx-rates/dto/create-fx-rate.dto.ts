import { IsString, IsNumber, IsPositive, IsDateString, IsUUID } from 'class-validator';

export class CreateFXRateDto {
  @IsUUID('4', { message: 'fromCurrencyId must be a valid UUID' })
  fromCurrencyId!: string;

  @IsUUID('4', { message: 'toCurrencyId must be a valid UUID' })
  toCurrencyId!: string;

  @IsNumber({}, { message: 'rate must be a number' })
  @IsPositive({ message: 'rate must be a positive number' })
  rate!: number;

  @IsDateString({}, { message: 'effectiveFrom must be a valid ISO date string' })
  effectiveFrom!: string;
}
