import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { PrismaService } from '../../database/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { Request } from 'express';
import type { Role } from '@prisma/client';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  activeScope?: {
    warehouseId: string;
    branchId: string;
  };
}

const SCOPE_EXEMPT_ROUTES = [
  '/api/v1/auth/',
  '/health',
  '/api/v1/admin/',
  '/api/v1/notifications',
  '/api/v1/dashboard/',
  '/api/v1/branches',
  '/api/v1/warehouses',
  '/api/v1/departments',
  '/api/v1/master-data/',
];

@Injectable()
export class ScopeInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ScopeInterceptor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const url: string = request.url || request.originalUrl || '';

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return next.handle();
    }

    const isExempt = SCOPE_EXEMPT_ROUTES.some((route) => url.startsWith(route));
    const warehouseId = request.headers['x-warehouse-id'] as string | undefined;
    const branchId = request.headers['x-branch-id'] as string | undefined;
    const hasHeaders = !!(warehouseId && branchId);

    if (isExempt && !hasHeaders) {
      return next.handle();
    }

    const authenticatedUser = request.user;
    if (!authenticatedUser) {
      return next.handle();
    }

    if (!warehouseId || !branchId) {
      throw new BadRequestException(
        'Missing active scope headers: x-warehouse-id, x-branch-id',
      );
    }

    const scope = await this.prisma.userWarehouseScope.findUnique({
      where: {
        userId_warehouseId: {
          userId: authenticatedUser.id,
          warehouseId,
        },
      },
      include: {
        warehouse: {
          select: { branchId: true },
        },
      },
    });

    if (!scope || scope.warehouse.branchId !== branchId) {
      await this.prisma.auditLog.create({
        data: {
          userId: authenticatedUser.id,
          action: 'SCOPE_ACCESS_VIOLATION',
          targetTable: 'warehouses',
          targetId: warehouseId,
          beforeStateJson: '',
          afterStateJson: JSON.stringify({
            attemptedWarehouseId: warehouseId,
            attemptedBranchId: branchId,
            actualBranchId: scope?.warehouse?.branchId || null,
            userId: authenticatedUser.id,
            userRole: authenticatedUser.role,
            userEmail: authenticatedUser.email,
            reason: !scope
              ? 'Warehouse scope not authorized'
              : 'Branch ID mismatch',
          }),
          ipAddress: request.ip || request.socket?.remoteAddress || undefined,
        },
      });

      throw new ForbiddenException('Access denied: Scope not authorized');
    }

    request.activeScope = {
      warehouseId,
      branchId,
    };

    return next.handle();
  }
}
