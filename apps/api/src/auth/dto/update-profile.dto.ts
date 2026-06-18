import {
  IsString,
  IsOptional,
  IsIn,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class NotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  lowStock?: boolean;

  @IsOptional()
  @IsBoolean()
  expiry?: boolean;

  @IsOptional()
  @IsBoolean()
  pendingApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  poFinalized?: boolean;

  @IsOptional()
  @IsBoolean()
  security?: boolean;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsIn(['en', 'ar'])
  language?: 'en' | 'ar';

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(['en', 'ar'])
  locale?: 'en' | 'ar';

  @IsOptional()
  @IsIn(['light', 'dark'])
  themePreferences?: 'light' | 'dark';

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notificationPreferences?: NotificationPreferencesDto;
}
