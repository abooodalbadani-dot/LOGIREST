import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { Response } from 'express';
import { OutboxService } from '../modules/outbox/outbox.service';
import { Role } from '@prisma/client';

@Injectable()
export class RtrService {
  private readonly logger = new Logger(RtrService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly outboxService: OutboxService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateRefreshToken(): { token: string; hash: string } {
    const token = randomBytes(64).toString('hex');
    const hash = this.hashToken(token);
    return { token, hash };
  }

  private setRefreshCookie(res: Response, token: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('logirest_refresh', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/api/v1/auth/refresh',
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  async createSession(userId: string, res: Response) {
    const sessionId = randomUUID();
    const { token, hash } = this.generateRefreshToken();

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hash,
        userId,
        sessionId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    this.setRefreshCookie(res, token);

    return { sessionId, token };
  }

  async rotateRefreshToken(
    currentToken: string,
    res: Response,
    ipAddress?: string,
  ): Promise<{ accessToken: string }> {
    const tokenHash = this.hashToken(currentToken);
    this.logger.debug(
      `Rotating refresh token: ${tokenHash.substring(0, 8)}...`,
    );

    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: { select: { id: true, email: true, role: true, isActive: true } },
      },
    });

    if (!existingToken) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    if (existingToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    if (existingToken.isRevoked) {
      this.logger.warn(
        `Replay attack detected! Session: ${existingToken.sessionId}`,
      );

      await this.prisma.$transaction(
        async (tx) => {
          await tx.refreshToken.updateMany({
            where: { sessionId: existingToken.sessionId },
            data: { isRevoked: true },
          });

          await tx.auditLog.create({
            data: {
              userId: existingToken.userId,
              action: 'REFRESH_TOKEN_REPLAY',
              targetTable: 'refresh_tokens',
              targetId: existingToken.sessionId,
              ipAddress,
              beforeStateJson: JSON.stringify({
                tokenHash: tokenHash.substring(0, 8),
                sessionId: existingToken.sessionId,
              }),
              afterStateJson: JSON.stringify({
                action: 'ALL_SESSION_TOKENS_REVOKED',
                sessionId: existingToken.sessionId,
              }),
            },
          });

          await this.outboxService.writeEvent(
            tx,
            'SECURITY_ALERT_REPLAY_ATTACK',
            {
              userId: existingToken.userId,
              sessionId: existingToken.sessionId,
              ipAddress: ipAddress || null,
              timestamp: new Date().toISOString(),
            },
          );

          await tx.notificationLog.create({
            data: {
              targetRole: Role.ADMIN,
              message: `🚨 SECURITY ALERT: Refresh token replay attack detected at ${new Date().toISOString()} for User ID: ${existingToken.userId}, Session ID: ${existingToken.sessionId}, IP: ${ipAddress ?? 'Unknown'}. All tokens for this session have been revoked immediately.`,
            },
          });
        },
        {
          timeout: 25000,
        },
      );

      throw new UnauthorizedException('Session expired or invalid');
    }

    if (!existingToken.user.isActive) {
      throw new UnauthorizedException('User account has been deactivated');
    }

    try {
      await this.prisma.refreshToken.update({
        where: {
          id: existingToken.id,
          version: existingToken.version,
        },
        data: {
          isRevoked: true,
          version: { increment: 1 },
        },
      });
    } catch {
      throw new UnauthorizedException('Session expired or invalid');
    }

    const { token: newToken, hash: newHash } = this.generateRefreshToken();

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: newHash,
        userId: existingToken.userId,
        sessionId: existingToken.sessionId,
        parentTokenId: existingToken.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const accessToken = this.jwtService.sign(
      {
        sub: existingToken.user.id,
        email: existingToken.user.email,
        role: existingToken.user.role,
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

    this.setRefreshCookie(res, newToken);

    return { accessToken };
  }

  async revokeSessionByToken(refreshTokenCookie: string): Promise<void> {
    const hash = this.hashToken(refreshTokenCookie);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash },
      data: { isRevoked: true },
    });
  }

  clearRefreshCookie(res: Response) {
    res.clearCookie('logirest_refresh', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/api/v1/auth/refresh',
      secure: process.env.NODE_ENV === 'production',
    });
    res.clearCookie('logirest_token', {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    });
  }
}
