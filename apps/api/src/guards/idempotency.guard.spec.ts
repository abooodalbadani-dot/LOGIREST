/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyGuard } from './idempotency.guard';
import { IdempotencyService } from '../services/idempotency.service';
import { Reflector } from '@nestjs/core';
import {
  ExecutionContext,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('IdempotencyGuard', () => {
  let guard: IdempotencyGuard;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockIdempotencyService = {
    getLog: jest.fn(),
    createPendingLog: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: IdempotencyService, useValue: mockIdempotencyService },
      ],
    }).compile();

    guard = module.get<IdempotencyGuard>(IdempotencyGuard);
    jest.clearAllMocks();
  });

  const mockExecutionContext = (headers: Record<string, string | string[]>) => {
    const req = { headers, idempotencyKey: undefined };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  it('should return true if route is not idempotent', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const context = mockExecutionContext({});
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw BadRequestException if header is missing', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = mockExecutionContext({});
    await expect(guard.canActivate(context)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException if header is multiple (array)', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = mockExecutionContext({
      'x-idempotency-key': ['key-1', 'key-2'],
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException if header format is invalid (not UUID v4)', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = mockExecutionContext({
      'x-idempotency-key': 'not-a-uuid',
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw ConflictException if request is processing (102)', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const uuid = 'c4d1d4d1-bebe-4a11-a83a-4a2a16c02621';
    const context = mockExecutionContext({ 'x-idempotency-key': uuid });
    mockIdempotencyService.getLog.mockResolvedValue({
      key: uuid,
      statusCode: 102,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ConflictException);
  });

  it('should return true if request is completed (not 102)', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const uuid = 'c4d1d4d1-bebe-4a11-a83a-4a2a16c02621';
    const context = mockExecutionContext({ 'x-idempotency-key': uuid });
    mockIdempotencyService.getLog.mockResolvedValue({
      key: uuid,
      statusCode: 200,
      responseBody: '{}',
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(context.switchToHttp().getRequest().idempotencyKey).toBe(uuid);
  });

  it('should lock and return true if request is new', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const uuid = 'c4d1d4d1-bebe-4a11-a83a-4a2a16c02621';
    const context = mockExecutionContext({ 'x-idempotency-key': uuid });
    mockIdempotencyService.getLog.mockResolvedValue(null);
    mockIdempotencyService.createPendingLog.mockResolvedValue({});

    const result = await guard.canActivate(context);
    expect(mockIdempotencyService.createPendingLog).toHaveBeenCalledWith(uuid);
    expect(result).toBe(true);
    expect(context.switchToHttp().getRequest().idempotencyKey).toBe(uuid);
  });

  it('should throw ConflictException on unique constraint error P2002', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const uuid = 'c4d1d4d1-bebe-4a11-a83a-4a2a16c02621';
    const context = mockExecutionContext({ 'x-idempotency-key': uuid });
    mockIdempotencyService.getLog.mockResolvedValue(null);
    const error = new Prisma.PrismaClientKnownRequestError('Error', {
      code: 'P2002',
      clientVersion: '5.0.0',
    });
    mockIdempotencyService.createPendingLog.mockRejectedValue(error);

    await expect(guard.canActivate(context)).rejects.toThrow(ConflictException);
  });
});
