import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { RtrService } from './rtr.service';
import { PrismaService } from '../database/prisma.service';
import type { Response } from 'express';

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */

describe('RtrService', () => {
  let rtrService: RtrService;

  const mockPrisma = {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-access-token'),
  };

  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RtrService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    rtrService = module.get<RtrService>(RtrService);

    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new refresh token and set cookie', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      const result = await rtrService.createSession('user-1', mockResponse);

      expect(result.sessionId).toBeDefined();
      expect(result.token).toBeDefined();
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'logirest_refresh',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          path: '/api/v1/auth/refresh',
        }),
      );
    });
  });

  describe('rotateRefreshToken', () => {
    it('should throw if token not found', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        rtrService.rotateRefreshToken('some-token', mockResponse),
      ).rejects.toThrow(
        new UnauthorizedException('Session expired or invalid'),
      );
    });

    it('should detect replay attack and revoke all session tokens', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        tokenHash: 'hash-1',
        userId: 'user-1',
        sessionId: 'session-1',
        isRevoked: true,
        user: {
          id: 'user-1',
          email: 'test@test.com',
          role: 'VIEWER',
          isActive: true,
        },
      });

      await expect(
        rtrService.rotateRefreshToken('replayed-token', mockResponse),
      ).rejects.toThrow(
        new UnauthorizedException('Session expired or invalid'),
      );

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-1' },
        data: { isRevoked: true },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'REFRESH_TOKEN_REPLAY',
          }),
        }),
      );
    });

    it('should throw if user is deactivated', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        tokenHash: 'hash-1',
        userId: 'user-1',
        sessionId: 'session-1',
        isRevoked: false,
        user: {
          id: 'user-1',
          email: 'test@test.com',
          role: 'VIEWER',
          isActive: false,
        },
      });

      await expect(
        rtrService.rotateRefreshToken('valid-token', mockResponse),
      ).rejects.toThrow(
        new UnauthorizedException('User account has been deactivated'),
      );
    });

    it('should rotate token successfully', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        tokenHash: 'hash-1',
        userId: 'user-1',
        sessionId: 'session-1',
        isRevoked: false,
        parentTokenId: null,
        version: 1,
        user: {
          id: 'user-1',
          email: 'test@test.com',
          role: 'VIEWER',
          isActive: true,
        },
      });
      mockPrisma.refreshToken.update.mockResolvedValue({ id: 'rt-1' });
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-2' });

      const result = await rtrService.rotateRefreshToken(
        'valid-token',
        mockResponse,
      );

      expect(result.accessToken).toBe('mock-access-token');
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1', version: 1 },
        data: {
          isRevoked: true,
          version: { increment: 1 },
        },
      });
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionId: 'session-1',
            parentTokenId: 'rt-1',
          }),
        }),
      );
      expect(mockResponse.cookie).toHaveBeenCalled();
    });
  });

  describe('revokeSessionByToken', () => {
    it('should revoke token by hash', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await rtrService.revokeSessionByToken('some-token');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalled();
    });
  });

  describe('clearRefreshCookie', () => {
    it('should clear the refresh cookie', () => {
      rtrService.clearRefreshCookie(mockResponse);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'logirest_refresh',
        expect.objectContaining({ path: '/api/v1/auth/refresh' }),
      );
    });
  });
});
