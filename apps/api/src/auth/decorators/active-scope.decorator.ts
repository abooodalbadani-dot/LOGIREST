import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface ActiveScope {
  warehouseId: string;
  branchId: string;
}

interface AuthenticatedRequest extends Request {
  activeScope: ActiveScope;
}

export const ActiveScope = createParamDecorator(
  (
    data: keyof ActiveScope | undefined,
    ctx: ExecutionContext,
  ): ActiveScope | string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const scope = request.activeScope;
    if (data === undefined) {
      return scope;
    }
    return scope[data];
  },
);
