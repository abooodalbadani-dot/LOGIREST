import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiHeader,
  ApiResponse,
} from '@nestjs/swagger';

/**
 * Standard security, authentication, and scope headers documentation decorator.
 * Apply this to all protected controllers that require JWT authentication
 * and Zero-Trust warehouse/branch scopes.
 */
export function ApiSecureController() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiCookieAuth('jwt'),
    ApiHeader({
      name: 'x-warehouse-id',
      description: 'Active warehouse scope ID',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    }),
    ApiHeader({
      name: 'x-branch-id',
      description: 'Active branch scope ID',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    }),
    ApiResponse({
      status: 400,
      description: 'Structured validation errors (BadRequestException)',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'name' },
                message: {
                  type: 'string',
                  example: 'name should not be empty',
                },
              },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Invalid, expired, or missing JWT token',
    }),
    ApiResponse({
      status: 403,
      description:
        'Forbidden - Access denied due to role or scope restrictions',
    }),
    ApiResponse({
      status: 423,
      description:
        'Locked - Warehouse is currently locked for physical stocktake',
    }),
  );
}

/**
 * Idempotency header documentation decorator.
 * Apply this to endpoints decorated with `@Idempotent()`.
 */
export function ApiIdempotentHeader() {
  return applyDecorators(
    ApiHeader({
      name: 'x-idempotency-key',
      description: 'Idempotency key (UUID v4) for mutating operations',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    }),
    ApiResponse({
      status: 409,
      description:
        'Conflict - Request is already being processed or has already been completed',
    }),
  );
}
