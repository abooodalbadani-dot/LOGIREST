import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BcryptService } from './bcrypt.service';
import { RtrService } from './rtr.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OutboxModule } from '../modules/outbox/outbox.module';

import { ConfigService } from '@nestjs/config';

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
  ],
  exports: [
    AuthService,
    RtrService,
    JwtModule,
    PassportModule,
    JwtAuthGuard,
    JwtStrategy,
  ],
})
export class AuthModule {}
