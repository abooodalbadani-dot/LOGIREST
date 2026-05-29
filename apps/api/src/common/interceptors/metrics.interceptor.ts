import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Histogram, register } from 'prom-client';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly httpDurationHistogram: Histogram<string>;

  constructor() {
    this.httpDurationHistogram =
      (register.getSingleMetric('logirest_http_request_duration_ms') as Histogram<string>) ||
      new Histogram({
        name: 'logirest_http_request_duration_ms',
        help: 'HTTP request duration in milliseconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
      });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();
    const method = req.method;
    
    // Express route template, e.g., /api/v1/items/:sku. If route is not yet matched or undefined (like 404s), fallback to '/unknown'
    const route = req.route?.path || '/unknown';

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const statusCode = res.statusCode || 200;
          this.httpDurationHistogram.observe(
            { method, route, status_code: String(statusCode) },
            Date.now() - start,
          );
        },
        error: (err) => {
          const statusCode = err.status || err.statusCode || 500;
          this.httpDurationHistogram.observe(
            { method, route, status_code: String(statusCode) },
            Date.now() - start,
          );
        },
      }),
    );
  }
}
