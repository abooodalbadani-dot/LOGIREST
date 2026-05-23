/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IdempotencyService } from '../services/idempotency.service';
import { IDEMPOTENT_METADATA_KEY } from '../decorators/idempotent.decorator';
import { Prisma } from '@prisma/client';

@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. Check if the endpoint is flagged for idempotency protection
    const isIdempotent = this.reflector.getAllAndOverride<boolean>(
      IDEMPOTENT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isIdempotent) {
      return true;
    }

    // 2. Extract x-idempotency-key header
    const key = request.headers['x-idempotency-key'];
    if (!key) {
      throw new BadRequestException('Missing x-idempotency-key header');
    }

    if (Array.isArray(key)) {
      throw new BadRequestException(
        'Multiple x-idempotency-key headers provided',
      );
    }

    // 3. Validate UUID v4 format
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidV4Regex.test(key)) {
      throw new BadRequestException('Invalid x-idempotency-key format');
    }

    // 4. Query the idempotency log from the database
    const log = await this.idempotencyService.getLog(key);

    if (log) {
      if (log.statusCode === 102) {
        // Request is currently being processed
        throw new ConflictException('Request is already being processed');
      }
      // Log exists and is completed. The interceptor will handle returning the cached response.
      request.idempotencyKey = key;
      return true;
    }

    // 5. Try to lock the request by creating a pending (102) log entry
    try {
      await this.idempotencyService.createPendingLog(key);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Request is already being processed');
      }
      throw error;
    }

    request.idempotencyKey = key;
    return true;
  }
}
