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
      include: {
        warehouseScopes: {
          include: {
            warehouse: true,
          },
        },
      },
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

    const mappedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      scopes: (user.warehouseScopes || []).map((s) => ({
        branch_id: s.warehouse?.branchId ?? null,
        warehouse_id: s.warehouseId,
        department_id: null,
      })),
      status: user.isActive ? 'ACTIVE' : ('INACTIVE' as const),
      language: 'en' as const,
    };

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        user: mappedUser,
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
      token: accessToken,
      accessToken,
      user: mappedUser,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        warehouseScopes: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      scopes: (user.warehouseScopes || []).map((s) => ({
        branch_id: s.warehouse?.branchId ?? null,
        warehouse_id: s.warehouseId,
        department_id: null,
      })),
      status: user.isActive ? 'ACTIVE' : ('INACTIVE' as const),
      language: 'en' as const,
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
