# API Validation DTOs: LogiRest Risk Remediation

This contract specifies the validated payload structures enforced at the NestJS HTTP entrypoints.

---

## 1. Profile Update Payload (`UpdateProfileDto`)

Endpoint: `PUT /api/v1/auth/profile`  
Role: Authenticated User  
Validation Library: `class-validator`, `class-transformer`

```typescript
import { IsString, IsOptional, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class NotificationPreferencesDto {
  @IsOptional()
  @IsIn([true, false])
  email?: boolean;

  @IsOptional()
  @IsIn([true, false])
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
```

### Protection Rules
1. Any payload parameter matching `email`, `role`, `scopes`, or security-sensitive parameters not defined in `UpdateProfileDto` is stripped automatically by the NestJS `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`).
2. Directly attempts to execute payload alterations on `role` or privilege fields return a `400 Bad Request`.

---

## 2. Password Reset Request (`ForgotPasswordDto` & `ResetPasswordDto`)

Endpoints: 
* `POST /api/v1/auth/forgot-password`
* `POST /api/v1/auth/reset-password`

```typescript
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword: string;
}
```
