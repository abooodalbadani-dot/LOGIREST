import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { BcryptService } from './bcrypt.service';
import { RtrService } from './rtr.service';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import type { Response } from 'express';

describe('AuthService', () => {
  let authService: AuthService;
  let bcryptService: BcryptService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      updateMany: jest.fn(),
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        BcryptService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RtrService, useValue: mockRtrService },
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
      });

      const result = await authService.login(loginDto, mockResponse);

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.user.id).toBe('user-1');
      expect(mockRtrService.createSession).toHaveBeenCalledWith(
        'user-1',
        mockResponse,
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile with authorized warehouses', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@logirest.com',
        name: 'Test User',
        role: 'WH_KEEPER',
        isActive: true,
        warehouseScopes: [{ warehouseId: 'wh-1' }, { warehouseId: 'wh-2' }],
      });

      const result = await authService.getProfile('user-1');

      expect(result.success).toBe(true);
      expect(result.user.authorizedWarehouses).toEqual(['wh-1', 'wh-2']);
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.getProfile('user-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
