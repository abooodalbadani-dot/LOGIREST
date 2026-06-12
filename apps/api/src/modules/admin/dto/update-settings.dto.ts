import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEmail,
  IsEnum,
  Min,
  Max,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaperSize {
  A4 = 'A4',
  T80 = '80mm',
  T58 = '58mm',
}

export class PrintSettingsDto {
  @IsEnum(PaperSize)
  @IsOptional()
  defaultPaperSize?: PaperSize;

  @IsBoolean()
  @IsOptional()
  thermalShowLogo?: boolean;

  @IsBoolean()
  @IsOptional()
  autoPrintOnFulfill?: boolean;
}

export enum MailProvider {
  SMTP = 'smtp',
  NONE = 'none',
}

export enum SmtpEncryption {
  TLS = 'tls',
  SSL = 'ssl',
  NONE = 'none',
}

export enum Locale {
  EN = 'en',
  AR = 'ar',
}

export class UpdateSettingsDto {
  @IsString()
  @IsOptional()
  systemName?: string;

  @IsString()
  @IsOptional()
  baseCurrency?: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsEnum(Locale)
  @IsOptional()
  localeDefault?: Locale;

  @IsString()
  @IsOptional()
  senderName?: string;

  @IsEmail()
  @IsOptional()
  replyToEmail?: string;

  @IsEnum(MailProvider)
  @IsOptional()
  mailProvider?: MailProvider;

  @IsString()
  @IsOptional()
  smtpHost?: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  @Type(() => Number)
  @IsOptional()
  smtpPort?: number;

  @IsString()
  @IsOptional()
  smtpUser?: string;

  @IsString()
  @IsOptional()
  smtpPassword?: string;

  @IsEnum(SmtpEncryption)
  @IsOptional()
  smtpEncryption?: SmtpEncryption;

  @ValidateNested()
  @Type(() => PrintSettingsDto)
  @IsOptional()
  printSettings?: PrintSettingsDto;
}
