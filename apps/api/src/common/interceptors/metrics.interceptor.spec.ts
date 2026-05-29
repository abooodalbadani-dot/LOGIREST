import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, HttpException } from '@nestjs/common';
import { of, throwError, lastValueFrom } from 'rxjs';
import { MetricsInterceptor } from './metrics.interceptor';
import { register } from 'prom-client';

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;

  const createMockContext = (opts: {
    method?: string;
    routePath?: string;
    statusCode?: number;
    errorStatus?: number;
  }): ExecutionContext => {
    const request = {
      method: opts.method || 'GET',
      route: opts.routePath ? { path: opts.routePath } : undefined,
    };

    const response = {
      statusCode: opts.statusCode || 200,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsInterceptor],
    }).compile();

    interceptor = module.get<MetricsInterceptor>(MetricsInterceptor);
  });

  afterEach(() => {
    // Clear metrics register to prevent collision
    register.clear();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should observe request duration for successful responses', async () => {
    const ctx = createMockContext({
      method: 'GET',
      routePath: '/api/v1/items/:sku',
      statusCode: 200,
    });

    const callHandler: CallHandler = {
      handle: () => of('success-value'),
    };

    const result$ = await interceptor.intercept(ctx, callHandler);
    const result = await lastValueFrom(result$);
    expect(result).toBe('success-value');

    const metricsStr = await register.metrics();
    expect(metricsStr).toContain('logirest_http_request_duration_ms_bucket');
    expect(metricsStr).toContain('method="GET"');
    expect(metricsStr).toContain('route="/api/v1/items/:sku"');
    expect(metricsStr).toContain('status_code="200"');
  });

  it('should fallback to /unknown for dynamic routes without defined pattern', async () => {
    const ctx = createMockContext({
      method: 'POST',
      statusCode: 201,
    });

    const callHandler: CallHandler = {
      handle: () => of('created'),
    };

    const result$ = await interceptor.intercept(ctx, callHandler);
    const result = await lastValueFrom(result$);
    expect(result).toBe('created');

    const metricsStr = await register.metrics();
    expect(metricsStr).toContain('route="/unknown"');
    expect(metricsStr).toContain('status_code="201"');
  });

  it('should observe request duration and map correct status code for error responses', async () => {
    const ctx = createMockContext({
      method: 'DELETE',
      routePath: '/api/v1/warehouses/:id',
    });

    const mockError = new HttpException('Conflict', 409);
    const callHandler: CallHandler = {
      handle: () => throwError(() => mockError),
    };

    const result$ = await interceptor.intercept(ctx, callHandler);
    await expect(lastValueFrom(result$)).rejects.toThrow(mockError);

    const metricsStr = await register.metrics();
    expect(metricsStr).toContain('method="DELETE"');
    expect(metricsStr).toContain('route="/api/v1/warehouses/:id"');
    expect(metricsStr).toContain('status_code="409"');
  });
});
