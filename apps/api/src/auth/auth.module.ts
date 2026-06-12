import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BcryptService } from './bcrypt.service';
import { RtrService } from './rtr.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OutboxModule } from '../modules/outbox/outbox.module';
import { ScopeValidationService } from './scope-validation.service';

import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_ACCESS_SECRET');
        if (!secret) {
          throw new Error(
            'FATAL: JWT_ACCESS_SECRET environment variable is missing.',
          );
        }
        const refreshSecret = configService.get<string>('JWT_REFRESH_SECRET');
        if (!refreshSecret) {
          throw new Error(
            'FATAL: JWT_REFRESH_SECRET environment variable is missing.',
          );
        }
        return {
          secret,
          signOptions: { expiresIn: '15m' },
        };
      },
    }),
    OutboxModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    BcryptService,
    RtrService,
    JwtStrategy,
    JwtAuthGuard,
    ScopeValidationService,
  ],
  exports: [
    AuthService,
    BcryptService,
    RtrService,
    JwtModule,
    PassportModule,
    JwtAuthGuard,
    JwtStrategy,
    ScopeValidationService,
  ],
})
export class AuthModule {}
