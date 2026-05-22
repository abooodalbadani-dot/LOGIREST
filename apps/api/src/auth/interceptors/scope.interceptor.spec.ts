import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import {
  ForbiddenException,
  BadRequestException,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { of } from 'rxjs';
import { ScopeInterceptor } from './scope.interceptor';
import { PrismaService } from '../../database/prisma.service';

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

describe('ScopeInterceptor', () => {
  let interceptor: ScopeInterceptor;
  let reflector: Reflector;

  const mockPrisma = {
    userWarehouseScope: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const createMockContext = (opts: {
    url?: string;
    user?: any;
    headers?: Record<string, string>;
    isPublic?: boolean;
  }): ExecutionContext => {
    const request = {
      url: opts.url || '/api/v1/items',
      originalUrl: opts.url || '/api/v1/items',
      headers: opts.headers || {},
      user: opts.user || undefined,
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;

    if (opts.isPublic) {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    }

    return context;
  };

  const callHandler: CallHandler = {
    handle: () => of('test'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScopeInterceptor,
        Reflector,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    interceptor = module.get<ScopeInterceptor>(ScopeInterceptor);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should skip validation for public routes', async () => {
    const ctx = createMockContext({ isPublic: true });
    const result$ = await interceptor.intercept(ctx, callHandler);
    result$.subscribe((val) => expect(val).toBe('test'));
    expect(mockPrisma.userWarehouseScope.findUnique).not.toHaveBeenCalled();
  });

  it('should skip validation for auth routes', async () => {
    const ctx = createMockContext({ url: '/api/v1/auth/login' });
    const result$ = await interceptor.intercept(ctx, callHandler);
    result$.subscribe((val) => expect(val).toBe('test'));
  });

  it('should skip if no authenticated user', async () => {
    const ctx = createMockContext({});
    const result$ = await interceptor.intercept(ctx, callHandler);
    result$.subscribe((val) => expect(val).toBe('test'));
  });

  it('should throw BadRequestException when scope headers are missing', async () => {
    const ctx = createMockContext({
      user: { id: 'user-1', role: 'WH_KEEPER' },
    });

    await expect(interceptor.intercept(ctx, callHandler)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw ForbiddenException and create audit log when scope is not authorized', async () => {
    mockPrisma.userWarehouseScope.findUnique.mockResolvedValue(null);

    const ctx = createMockContext({
      user: { id: 'user-1', role: 'WH_KEEPER', email: 'test@test.com' },
      headers: { 'x-warehouse-id': 'wh-unauthorized', 'x-branch-id': 'br-1' },
    });

    await expect(interceptor.intercept(ctx, callHandler)).rejects.toThrow(
      ForbiddenException,
    );

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'SCOPE_ACCESS_VIOLATION',
          userId: 'user-1',
        }),
      }),
    );
  });

  it('should inject activeScope when authorized', async () => {
    mockPrisma.userWarehouseScope.findUnique.mockResolvedValue({
      userId_warehouseId: { userId: 'user-1', warehouseId: 'wh-1' },
    });

    const ctx = createMockContext({
      user: { id: 'user-1', role: 'WH_KEEPER', email: 'test@test.com' },
      headers: { 'x-warehouse-id': 'wh-1', 'x-branch-id': 'br-1' },
    });

    const result$ = await interceptor.intercept(ctx, callHandler);

    result$.subscribe((val) => {
      expect(val).toBe('test');
    });

    const request = (ctx as any).switchToHttp().getRequest();
    expect(request.activeScope).toEqual({
      warehouseId: 'wh-1',
      branchId: 'br-1',
    });
  });
});
