import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RtrService } from './rtr.service';
import { LoginDto } from './dto/login.dto';
import type { Request, Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let rtrService: RtrService;

  const mockAuthService = {
    login: jest.fn(),
    getProfile: jest.fn(),
  };

  const mockRtrService = {
    rotateRefreshToken: jest.fn(),
    revokeSessionByToken: jest.fn(),
    clearRefreshCookie: jest.fn(),
  };

  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;

  const mockRequest = {
    cookies: {},
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: RtrService, useValue: mockRtrService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    rtrService = module.get<RtrService>(RtrService);

    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should call authService.login', async () => {
      const dto: LoginDto = {
        email: 'test@logirest.com',
        password: 'password',
      };
      const expectedResult = {
        token: 'token',
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@logirest.com',
          role: 'WH_KEEPER' as const,
          scopes: [],
          status: 'ACTIVE' as const,
          language: 'en' as const,
        },
      };
      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(dto, mockResponse, {
        ip: '127.0.0.1',
        headers: {},
      } as unknown as Request);
      expect(result).toEqual(expectedResult);
      expect(mockAuthService.login).toHaveBeenCalledWith(
        dto,
        mockResponse,
        '127.0.0.1',
      );
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException if refresh token cookie is missing', async () => {
      const req = { cookies: {} } as Request;
      await expect(
        controller.refresh(req, mockResponse, '127.0.0.1'),
      ).rejects.toThrow(new UnauthorizedException('No refresh token provided'));
    });

    it('should call rtrService.rotateRefreshToken if cookie exists', async () => {
      const req = {
        cookies: { logirest_refresh: 'rt-token' },
      } as unknown as Request;
      mockRtrService.rotateRefreshToken.mockResolvedValue({
        accessToken: 'new-at',
      });

      const result = await controller.refresh(req, mockResponse, '127.0.0.1');
      expect(result).toEqual({ success: true, accessToken: 'new-at' });
      expect(mockRtrService.rotateRefreshToken).toHaveBeenCalledWith(
        'rt-token',
        mockResponse,
        '127.0.0.1',
      );
    });
  });

  describe('logout', () => {
    it('should revoke session and clear cookie if refresh token exists', async () => {
      const req = {
        cookies: { logirest_refresh: 'rt-token' },
      } as unknown as Request;

      const result = await controller.logout(req, mockResponse);
      expect(result).toEqual({ success: true });
      expect(mockRtrService.revokeSessionByToken).toHaveBeenCalledWith(
        'rt-token',
      );
      expect(mockRtrService.clearRefreshCookie).toHaveBeenCalledWith(
        mockResponse,
      );
    });

    it('should only clear cookie if no refresh token exists', async () => {
      const req = { cookies: {} } as unknown as Request;

      const result = await controller.logout(req, mockResponse);
      expect(result).toEqual({ success: true });
      expect(mockRtrService.revokeSessionByToken).not.toHaveBeenCalled();
      expect(mockRtrService.clearRefreshCookie).toHaveBeenCalledWith(
        mockResponse,
      );
    });
  });

  describe('getProfile', () => {
    it('should call authService.getProfile', async () => {
      const expectedProfile = {
        id: '1',
        name: 'Test User',
        email: 'test@logirest.com',
        role: 'WH_KEEPER' as const,
        scopes: [],
        status: 'ACTIVE' as const,
        language: 'en' as const,
      };
      mockAuthService.getProfile.mockResolvedValue(expectedProfile);

      const result = await controller.getProfile('1');
      expect(result).toEqual(expectedProfile);
      expect(mockAuthService.getProfile).toHaveBeenCalledWith('1');
    });
  });
});
