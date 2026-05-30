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
  email?: boolean;

  @IsOptional()
  @IsBoolean()
  push?: boolean;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['en', 'ar'])
  language?: 'en' | 'ar';

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notification_preferences?: NotificationPreferencesDto;
}
