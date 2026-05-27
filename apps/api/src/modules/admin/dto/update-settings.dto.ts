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
  @IsNotEmpty()
  system_name!: string;

  @IsString()
  @IsNotEmpty()
  base_currency!: string;

  @IsString()
  @IsNotEmpty()
  branch_id!: string;

  @IsString()
  @IsNotEmpty()
  timezone!: string;

  @IsEnum(Locale)
  locale_default!: Locale;

  @IsString()
  @IsNotEmpty()
  sender_name!: string;

  @IsEmail()
  reply_to_email!: string;

  @IsEnum(MailProvider)
  @IsOptional()
  mail_provider?: MailProvider;

  @IsString()
  @IsOptional()
  smtp_host?: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  @Type(() => Number)
  @IsOptional()
  smtp_port?: number;

  @IsString()
  @IsOptional()
  smtp_user?: string;

  @IsString()
  @IsOptional()
  smtp_password?: string;

  @IsEnum(SmtpEncryption)
  @IsOptional()
  smtp_encryption?: SmtpEncryption;
}
