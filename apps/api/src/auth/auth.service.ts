import {
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { BcryptService } from './bcrypt.service';
import { RtrService } from './rtr.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { OutboxService } from '../modules/outbox/outbox.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bcrypt: BcryptService,
    private readonly jwtService: JwtService,
    private readonly rtrService: RtrService,
    private readonly config: ConfigService,
    private readonly outboxService: OutboxService,
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

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account temporarily locked');
    }

    if (!user.isActive) {
      await this.logFailedLogin(dto.email, user, 'user_deactivated', ipAddress);
      throw new UnauthorizedException('User account has been deactivated');
    }

    const valid = await this.bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      const newAttempts = user.failedLoginAttempts + 1;
      const isLocked = newAttempts >= 5;
      const lockedUntil = isLocked
        ? new Date(Date.now() + 15 * 60 * 1000)
        : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil,
        },
      });

      if (isLocked) {
        await this.prisma.notificationLog.create({
          data: {
            targetRole: 'ADMIN',
            message: `User account ${user.email} has been temporarily locked due to 5 consecutive failed login attempts.`,
          },
        });
      }

      await this.logFailedLogin(dto.email, user, 'invalid_password', ipAddress);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset login counters on success
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Write successful login audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        targetTable: 'users',
        targetId: user.id,
        ipAddress: ipAddress ?? null,
        beforeStateJson: '{}',
        afterStateJson: JSON.stringify({ email: user.email, role: user.role }),
      },
    });

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
      avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.id}`,
      phone: null,
      locale: 'en' as const,
      notification_preferences: {
        lowStock: true,
        expiry: true,
        pendingApproval: true,
        poFinalized: false,
        security: true,
      },
    };
  }

  async updateProfile(userId: string, body: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: body.name || undefined,
      },
      include: {
        warehouseScopes: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    // Write profile update audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_PROFILE_UPDATED',
        targetTable: 'users',
        targetId: userId,
        beforeStateJson: JSON.stringify({ name: user.name }),
        afterStateJson: JSON.stringify({ name: updatedUser.name }),
      },
    });

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      scopes: (updatedUser.warehouseScopes || []).map((s) => ({
        branch_id: s.warehouse?.branchId ?? null,
        warehouse_id: s.warehouseId,
        department_id: null,
      })),
      status: updatedUser.isActive ? 'ACTIVE' : 'INACTIVE',
      language: body.language || 'en',
      avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${updatedUser.id}`,
      phone: body.phone || null,
      locale: body.locale || 'en',
      notification_preferences: body.notification_preferences || {
        lowStock: true,
        expiry: true,
        pendingApproval: true,
        poFinalized: false,
        security: true,
      },
    };
  }

  async uploadAvatar(userId: string, file: any) {
    // Generate a mock avatar URL using the userId to make it look realistic
    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${userId}-${Date.now()}`;
    return { avatar_url: avatarUrl };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      this.logger.warn(
        `Password reset requested for non-existent email: ${email}`,
      );
      return {
        success: true,
        message: 'Password reset link sent to your email.',
      };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${rawToken}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      // Write outbox event for email dispatch
      await this.outboxService.writeEvent(tx, 'PASSWORD_RESET_REQUESTED', {
        userId: user.id,
        email: user.email,
        name: user.name,
        resetUrl,
      });
    });

    this.logger.log(
      `Password reset token generated and outbox event queued for user ID: ${user.id}`,
    );
    return {
      success: true,
      message: 'Password reset link sent to your email.',
    };
  }

  async resetPassword(token: string, passwordPlan: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.expiresAt < new Date() || record.usedAt) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const passwordHash = await this.bcrypt.hash(passwordPlan);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          version: { increment: 1 },
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: {
          usedAt: new Date(),
        },
      });
    });

    this.logger.log(
      `Password reset executed successfully for user: ${record.user.email}`,
    );
    return { success: true, message: 'Password has been reset successfully.' };
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
