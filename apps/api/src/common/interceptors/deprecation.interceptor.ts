import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DEPRECATED_METADATA_KEY, DeprecatedOptions } from '../decorators/deprecated.decorator';

@Injectable()
export class DeprecationInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const controller = context.getClass();

    // Check if the handler or class is decorated with @Deprecated
    const deprecatedOptions =
      this.reflector.getAllAndOverride<DeprecatedOptions & { deprecated?: boolean }>(
        DEPRECATED_METADATA_KEY,
        [handler, controller],
      );

    return next.handle().pipe(
      tap(() => {
        if (deprecatedOptions?.deprecated) {
          const response = context.switchToHttp().getResponse();
          // Express / NestJS response.setHeader()
          if (response && typeof response.setHeader === 'function') {
            response.setHeader('Deprecation', 'true');
            if (deprecatedOptions.sunsetAt) {
              response.setHeader('Sunset', deprecatedOptions.sunsetAt);
            }
          }
        }
      }),
    );
  }
}
