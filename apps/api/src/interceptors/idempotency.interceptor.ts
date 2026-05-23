/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, from, throwError } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { IdempotencyService } from '../services/idempotency.service';
import { IDEMPOTENT_METADATA_KEY } from '../decorators/idempotent.decorator';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // 1. Check if endpoint is flagged for idempotency protection
    const isIdempotent = this.reflector.getAllAndOverride<boolean>(
      IDEMPOTENT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isIdempotent) {
      return next.handle();
    }

    const key = request.idempotencyKey;
    if (!key) {
      return next.handle();
    }

    // 2. Fetch the current state of the idempotency log
    const log = await this.idempotencyService.getLog(key);

    if (log && log.statusCode !== 102) {
      // Return cached response
      response.status(log.statusCode);
      return of(JSON.parse(log.responseBody));
    }

    // 3. Process request and cache the result or clean up on failure
    return next.handle().pipe(
      mergeMap(async (data) => {
        const statusCode = response.statusCode || 201;
        await this.idempotencyService.updateLog(
          key,
          statusCode,
          JSON.stringify(data || {}),
        );
        return data;
      }),
      catchError((error) => {
        // Remove the pending lock so the client can retry the request
        return from(
          Promise.resolve(this.idempotencyService.deleteLog(key)).catch(
            (dbError) => {
              // Log but do not mask the original request error
              console.error(
                `Failed to clear pending idempotency log for key: ${key}`,
                dbError,
              );
            },
          ),
        ).pipe(mergeMap(() => throwError(() => error)));
      }),
    );
  }
}
