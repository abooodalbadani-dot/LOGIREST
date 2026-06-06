import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEmail,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

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
}
