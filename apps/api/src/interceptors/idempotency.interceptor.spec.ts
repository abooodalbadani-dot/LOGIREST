/* eslint-disable @typescript-eslint/no-floating-promises */
import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyService } from '../services/idempotency.service';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockIdempotencyService = {
    getLog: jest.fn(),
    updateLog: jest.fn(),
    deleteLog: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyInterceptor,
        { provide: Reflector, useValue: mockReflector },
        { provide: IdempotencyService, useValue: mockIdempotencyService },
      ],
    }).compile();

    interceptor = module.get<IdempotencyInterceptor>(IdempotencyInterceptor);
    jest.clearAllMocks();
  });

  const mockExecutionContext = (
    idempotencyKey?: string,
    responseStatusCode = 200,
  ) => {
    const req = { idempotencyKey };
    const res = {
      statusCode: responseStatusCode,
      status: jest.fn().mockImplementation((code) => {
        res.statusCode = code;
        return res;
      }),
    };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  const mockCallHandler = (value: any) => {
    return {
      handle: () => of(value),
    } as CallHandler;
  };

  const mockCallHandlerError = (error: any) => {
    return {
      handle: () => throwError(() => error),
    } as CallHandler;
  };

  it('should pass through if route is not idempotent', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const context = mockExecutionContext();
    const handler = mockCallHandler('value');

    const result$ = await interceptor.intercept(context, handler);
    result$.subscribe((result) => {
      expect(result).toBe('value');
    });
  });

  it('should pass through if idempotency key is missing from request', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = mockExecutionContext(undefined);
    const handler = mockCallHandler('value');

    const result$ = await interceptor.intercept(context, handler);
    result$.subscribe((result) => {
      expect(result).toBe('value');
    });
  });

  it('should return cached response if log completed (not 102)', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = mockExecutionContext('key-1');
    const handler = mockCallHandler('should-not-reach-here');
    mockIdempotencyService.getLog.mockResolvedValue({
      statusCode: 201,
      responseBody: '{"data":"cached"}',
    });

    const result$ = await interceptor.intercept(context, handler);
    result$.subscribe((result) => {
      expect(result).toEqual({ data: 'cached' });
      const res = context.switchToHttp().getResponse();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  it('should execute next.handle(), cache response on success, and update log', (done) => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = mockExecutionContext('key-1', 201);
    const handler = mockCallHandler({ data: 'success' });
    mockIdempotencyService.getLog.mockResolvedValue({
      statusCode: 102, // Processing lock
    });

    interceptor.intercept(context, handler).then((result$) => {
      result$.subscribe({
        next: (result) => {
          expect(result).toEqual({ data: 'success' });
        },
        complete: () => {
          setTimeout(() => {
            try {
              expect(mockIdempotencyService.updateLog).toHaveBeenCalledWith(
                'key-1',
                201,
                '{"data":"success"}',
              );
              done();
            } catch (err) {
              done(err);
            }
          }, 20);
        },
      });
    });
  });

  it('should delete log and rethrow error on handler failure', (done) => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = mockExecutionContext('key-1');
    const handler = mockCallHandlerError(new Error('Process error'));
    mockIdempotencyService.getLog.mockResolvedValue({
      statusCode: 102,
    });

    interceptor.intercept(context, handler).then((result$) => {
      result$.subscribe({
        error: (err) => {
          expect(err.message).toBe('Process error');
          setTimeout(() => {
            try {
              expect(mockIdempotencyService.deleteLog).toHaveBeenCalledWith(
                'key-1',
              );
              done();
            } catch (dbError) {
              done(dbError);
            }
          }, 20);
        },
      });
    });
  });
});
