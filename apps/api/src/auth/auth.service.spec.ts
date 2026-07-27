import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { BcryptService } from './bcrypt.service';
import { RtrService } from './rtr.service';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { OutboxService } from '../modules/outbox/outbox.service';

describe('AuthService', () => {
  let authService: AuthService;
  let bcryptService: BcryptService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    notificationLog: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-access-token'),
  };

  const mockRtrService = {
    createSession: jest
      .fn()
      .mockResolvedValue({ sessionId: 'session-1', token: 'rt-token' }),
    rotateRefreshToken: jest.fn(),
    revokeSessionByToken: jest.fn(),
    clearRefreshCookie: jest.fn(),
  };

  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'test-access-secret';
        if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
        return null;
      }),
    };

    const mockOutboxService = {
      writeEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        BcryptService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RtrService, useValue: mockRtrService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OutboxService, useValue: mockOutboxService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    bcryptService = module.get<BcryptService>(BcryptService);

    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'user@logirest.com',
      password: 'password123',
    };

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login(loginDto, mockResponse)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
    });

    it('should throw if user is deactivated', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@logirest.com',
        passwordHash: 'hash',
        name: 'Test User',
        role: 'WH_KEEPER',
        isActive: false,
      });

      await expect(authService.login(loginDto, mockResponse)).rejects.toThrow(
        new UnauthorizedException('User account has been deactivated'),
      );
    });

    it('should throw if password is invalid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@logirest.com',
        passwordHash: await bcryptService.hash('different'),
        name: 'Test User',
        role: 'WH_KEEPER',
        isActive: true,
      });

      await expect(authService.login(loginDto, mockResponse)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
    });

    it('should succeed with valid credentials', async () => {
      const hash = await bcryptService.hash('password123');
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@logirest.com',
        passwordHash: hash,
        name: 'Test User',
        role: 'WH_KEEPER',
        isActive: true,
        warehouseScopes: [
          {
            warehouseId: 'wh-1',
            warehouse: { id: 'wh-1', name: 'Main WH', branchId: 'br-1' },
          },
        ],
      });

      const result = await authService.login(loginDto, mockResponse);

      expect(result.token).toBe('mock-access-token');
      expect(result.user.id).toBe('user-1');
      expect(result.user.scopes).toEqual([
        {
          branchId: 'br-1',
          warehouseId: 'wh-1',
          departmentId: null,
          warehouse: { id: 'wh-1', name: 'Main WH' },
          department: null,
        },
      ]);
      expect(mockRtrService.createSession).toHaveBeenCalledWith(
        'user-1',
        mockResponse,
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile with scopes', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@logirest.com',
        name: 'Test User',
        role: 'WH_KEEPER',
        isActive: true,
        warehouseScopes: [
          {
            warehouseId: 'wh-1',
            warehouse: { id: 'wh-1', name: 'WH 1', branchId: 'br-1' },
          },
          {
            warehouseId: 'wh-2',
            warehouse: { id: 'wh-2', name: 'WH 2', branchId: 'br-1' },
          },
        ],
      });

      const result = await authService.getProfile('user-1');

      expect(result.id).toBe('user-1');
      expect(result.scopes).toEqual([
        {
          branchId: 'br-1',
          warehouseId: 'wh-1',
          departmentId: null,
          branch: null,
          warehouse: { id: 'wh-1', name: 'WH 1', code: null },
          department: null,
        },
        {
          branchId: 'br-1',
          warehouseId: 'wh-2',
          departmentId: null,
          branch: null,
          warehouse: { id: 'wh-2', name: 'WH 2', code: null },
          department: null,
        },
      ]);
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.getProfile('user-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('changePassword', () => {
    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.changePassword('user-1', 'old-pass', 'new-pass'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if current password does not match', async () => {
      const hash = await bcryptService.hash('correct-pass');
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: hash,
      });

      await expect(
        authService.changePassword('user-1', 'wrong-pass', 'new-pass'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update user password and create audit log', async () => {
      const hash = await bcryptService.hash('old-pass');
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: hash,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await authService.changePassword(
        'user-1',
        'old-pass',
        'new-pass',
      );

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });
});
