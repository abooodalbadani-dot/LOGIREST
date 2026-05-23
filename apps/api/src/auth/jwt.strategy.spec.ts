import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { PrismaService } from '../database/prisma.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('validate', () => {
    const payload: JwtPayload = {
      sub: 'user-1',
      email: 'user@logirest.com',
      role: 'WH_KEEPER',
    };

    it('should throw UnauthorizedException if user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        new UnauthorizedException('User no longer exists'),
      );
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
        },
      });
    });

    it('should throw UnauthorizedException if user is deactivated', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@logirest.com',
        role: 'WH_KEEPER',
        isActive: false,
      });

      await expect(strategy.validate(payload)).rejects.toThrow(
        new UnauthorizedException('User account has been deactivated'),
      );
    });

    it('should return user object if validation succeeds', async () => {
      const user = {
        id: 'user-1',
        email: 'user@logirest.com',
        name: 'Test User',
        role: 'WH_KEEPER',
        isActive: true,
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await strategy.validate(payload);
      expect(result).toEqual(user);
    });
  });
});
