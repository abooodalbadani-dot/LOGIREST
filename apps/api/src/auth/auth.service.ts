import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { BcryptService } from './bcrypt.service';
import { RtrService } from './rtr.service';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bcrypt: BcryptService,
    private readonly jwtService: JwtService,
    private readonly rtrService: RtrService,
  ) {}

  async login(dto: LoginDto, res: Response, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      await this.logFailedLogin(dto.email, null, 'user_not_found', ipAddress);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      await this.logFailedLogin(dto.email, user, 'user_deactivated', ipAddress);
      throw new UnauthorizedException('User account has been deactivated');
    }

    const valid = await this.bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.logFailedLogin(dto.email, user, 'invalid_password', ipAddress);
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      { expiresIn: '15m' },
    );

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('logirest_token', accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      secure: isProduction,
      maxAge: 15 * 60 * 1000,
    });

    await this.rtrService.createSession(user.id, res);

    return {
      success: true,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        warehouseScopes: {
          select: {
            warehouseId: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        authorizedWarehouses: user.warehouseScopes.map((s) => s.warehouseId),
      },
    };
  }

  private async logFailedLogin(
    email: string,
    user: any | null,
    reason: string,
    ipAddress?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: user?.id ?? null,
          action: 'LOGIN_FAILED',
          targetTable: 'users',
          targetId: user?.id ?? email,
          ipAddress: ipAddress ?? null,
          beforeStateJson: JSON.stringify({ email, reason }),
          afterStateJson: JSON.stringify({ attempt: 'FAILED' }),
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to create failed login audit log: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
