import { IsEmail, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Invalid email address format' })
  email!: string;

  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;
}
