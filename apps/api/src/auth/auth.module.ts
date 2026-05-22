import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BcryptService } from './bcrypt.service';
import { RtrService } from './rtr.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret:
        process.env.JWT_ACCESS_SECRET ||
        'dev-jwt-access-secret-key-at-least-32-chars-long',
      signOptions: { expiresIn: '15m' },
    }),
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
