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
import * as fs from 'fs';
import * as path from 'path';

export interface NotificationPreferences {
  lowStock: boolean;
  expiry: boolean;
  pendingApproval: boolean;
  poFinalized: boolean;
  security: boolean;
}

function parseNotificationPreferences(json: unknown): NotificationPreferences {
  const defaultPrefs: NotificationPreferences = {
    lowStock: true,
    expiry: true,
    pendingApproval: true,
    poFinalized: false,
    security: true,
  };
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    const obj = json as Record<string, unknown>;
    return {
      lowStock:
        typeof obj.lowStock === 'boolean'
          ? obj.lowStock
          : defaultPrefs.lowStock,
      expiry:
        typeof obj.expiry === 'boolean' ? obj.expiry : defaultPrefs.expiry,
      pendingApproval:
        typeof obj.pendingApproval === 'boolean'
          ? obj.pendingApproval
          : defaultPrefs.pendingApproval,
      poFinalized:
        typeof obj.poFinalized === 'boolean'
          ? obj.poFinalized
          : defaultPrefs.poFinalized,
      security:
        typeof obj.security === 'boolean'
          ? obj.security
          : defaultPrefs.security,
    };
  }
  return defaultPrefs;
}

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
        departmentScopes: {
          include: {
            department: true,
          },
        },
        branchScopes: {
          include: {
            branch: true,
          },
        },
      },
    });

    if (!user) {
      // Execute dummy bcrypt check to prevent timing attacks
      const dummyHash =
        '$2b$10$sO8YI23iA0R1N0M3D0U2M.b3y8t1g2h3j4k5l6m7n8o9p0q1r2s3t';
      await this.bcrypt.compare(dto.password, dummyHash);
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
      scopes: [
        ...(user.warehouseScopes || []).map((s) => ({
          branchId: s.warehouse?.branchId ?? null,
          warehouseId: s.warehouseId,
          departmentId: null,
          warehouse: s.warehouse
            ? {
                id: s.warehouse.id,
                name: s.warehouse.name,
              }
            : null,
          department: null,
        })),
        ...(user.departmentScopes || []).map((s) => ({
          branchId: s.department?.branchId ?? null,
          warehouseId: null,
          departmentId: s.departmentId,
          warehouse: null,
          department: s.department
            ? {
                id: s.department.id,
                name: s.department.name,
              }
            : null,
        })),
        ...(user.branchScopes || []).map((s) => ({
          branchId: s.branchId,
          warehouseId: null,
          departmentId: null,
          warehouse: null,
          department: null,
          branch: s.branch
            ? {
                id: s.branch.id,
                name: s.branch.name,
              }
            : null,
        })),
      ],
      status: user.isActive ? 'ACTIVE' : ('INACTIVE' as const),
      language: (user.locale || 'ar') as 'en' | 'ar',
      locale: (user.locale || 'ar') as 'en' | 'ar',
      avatarUrl: user.avatarUrl || null,
      phone: user.phone || null,
      themePreferences: (user.themePreferences || 'light') as 'light' | 'dark',
      notificationPreferences: parseNotificationPreferences(
        user.notificationPreferences,
      ),
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
        departmentScopes: {
          include: {
            department: true,
          },
        },
        branchScopes: {
          include: {
            branch: true,
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
      scopes: [
        ...(user.warehouseScopes || []).map((s) => ({
          branchId: s.warehouse?.branchId ?? null,
          warehouseId: s.warehouseId,
          departmentId: null,
          warehouse: s.warehouse
            ? {
                id: s.warehouse.id,
                name: s.warehouse.name,
              }
            : null,
          department: null,
        })),
        ...(user.departmentScopes || []).map((s) => ({
          branchId: s.department?.branchId ?? null,
          warehouseId: null,
          departmentId: s.departmentId,
          warehouse: null,
          department: s.department
            ? {
                id: s.department.id,
                name: s.department.name,
              }
            : null,
        })),
        ...(user.branchScopes || []).map((s) => ({
          branchId: s.branchId,
          warehouseId: null,
          departmentId: null,
          warehouse: null,
          department: null,
          branch: s.branch
            ? {
                id: s.branch.id,
                name: s.branch.name,
              }
            : null,
        })),
      ],
      status: user.isActive ? 'ACTIVE' : ('INACTIVE' as const),
      language: (user.locale || 'ar') as 'en' | 'ar',
      avatarUrl: user.avatarUrl || null,
      phone: user.phone || null,
      locale: (user.locale || 'ar') as 'en' | 'ar',
      themePreferences: (user.themePreferences || 'light') as 'light' | 'dark',
      notificationPreferences: parseNotificationPreferences(
        user.notificationPreferences,
      ),
    };
  }

  async updateProfile(userId: string, body: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const targetLocale = body.locale || body.language || undefined;

    let mergedPrefs: Record<string, boolean> | undefined = undefined;
    if (body.notificationPreferences) {
      const existing = parseNotificationPreferences(
        user.notificationPreferences,
      );
      mergedPrefs = {
        lowStock:
          body.notificationPreferences.lowStock !== undefined
            ? body.notificationPreferences.lowStock
            : existing.lowStock,
        expiry:
          body.notificationPreferences.expiry !== undefined
            ? body.notificationPreferences.expiry
            : existing.expiry,
        pendingApproval:
          body.notificationPreferences.pendingApproval !== undefined
            ? body.notificationPreferences.pendingApproval
            : existing.pendingApproval,
        poFinalized:
          body.notificationPreferences.poFinalized !== undefined
            ? body.notificationPreferences.poFinalized
            : existing.poFinalized,
        security:
          body.notificationPreferences.security !== undefined
            ? body.notificationPreferences.security
            : existing.security,
      };
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: body.name || undefined,
        email: body.email || undefined,
        phone: body.phone !== undefined ? body.phone : undefined,
        locale: targetLocale,
        themePreferences: body.themePreferences || undefined,
        notificationPreferences: mergedPrefs || undefined,
      },
      include: {
        warehouseScopes: {
          include: {
            warehouse: true,
          },
        },
        departmentScopes: {
          include: {
            department: true,
          },
        },
        branchScopes: {
          include: {
            branch: true,
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
        beforeStateJson: JSON.stringify({
          name: user.name,
          phone: user.phone,
          locale: user.locale,
          themePreferences: user.themePreferences,
          notificationPreferences: user.notificationPreferences,
        }),
        afterStateJson: JSON.stringify({
          name: updatedUser.name,
          phone: updatedUser.phone,
          locale: updatedUser.locale,
          themePreferences: updatedUser.themePreferences,
          notificationPreferences: updatedUser.notificationPreferences,
        }),
      },
    });

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      scopes: [
        ...(updatedUser.warehouseScopes || []).map((s) => ({
          branchId: s.warehouse?.branchId ?? null,
          warehouseId: s.warehouseId,
          departmentId: null,
          warehouse: s.warehouse
            ? {
                id: s.warehouse.id,
                name: s.warehouse.name,
              }
            : null,
          department: null,
        })),
        ...(updatedUser.departmentScopes || []).map((s) => ({
          branchId: s.department?.branchId ?? null,
          warehouseId: null,
          departmentId: s.departmentId,
          warehouse: null,
          department: s.department
            ? {
                id: s.department.id,
                name: s.department.name,
              }
            : null,
        })),
        ...(updatedUser.branchScopes || []).map((s) => ({
          branchId: s.branchId,
          warehouseId: null,
          departmentId: null,
          warehouse: null,
          department: null,
          branch: s.branch
            ? {
                id: s.branch.id,
                name: s.branch.name,
              }
            : null,
        })),
      ],
      status: updatedUser.isActive ? 'ACTIVE' : 'INACTIVE',
      language: (updatedUser.locale || 'ar') as 'en' | 'ar',
      avatarUrl: updatedUser.avatarUrl || null,
      phone: updatedUser.phone || null,
      locale: (updatedUser.locale || 'ar') as 'en' | 'ar',
      themePreferences: (updatedUser.themePreferences || 'light') as
        | 'light'
        | 'dark',
      notificationPreferences: parseNotificationPreferences(
        updatedUser.notificationPreferences,
      ),
    };
  }

  async uploadAvatar(
    userId: string,
    file:
      | { buffer?: Buffer; mimetype?: string; originalname?: string }
      | undefined,
  ) {
    if (!file || !file.buffer || !file.originalname) {
      throw new BadRequestException('Avatar file is missing or invalid.');
    }

    const rootDir = process.cwd().includes('apps')
      ? path.join(process.cwd(), '..', '..')
      : process.cwd();
    const uploadDir = path.join(
      rootDir,
      'apps',
      'web',
      'public',
      'uploads',
      'avatars',
    );
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.originalname);
    const filename = `user_${userId}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, file.buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    return { avatarUrl };
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
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

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

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentValid = await this.bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!isCurrentValid) {
      throw new BadRequestException('Incorrect current password');
    }

    const newPasswordHash = await this.bcrypt.hash(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        version: { increment: 1 },
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PASSWORD_CHANGED',
        targetTable: 'users',
        targetId: userId,
        beforeStateJson: '{}',
        afterStateJson: '{}',
      },
    });

    return { success: true };
  }

  private async logFailedLogin(
    email: string,
    user: { id: string; email: string } | null,
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
