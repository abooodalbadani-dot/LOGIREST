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
    departmentId?: string;
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
  '/api/v1/currencies',
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

    // Normalize URL and exempt routes (remove query string, global api and v1 prefix)
    const cleanUrl = url.split('?')[0];
    const isExempt = SCOPE_EXEMPT_ROUTES.some((route) => {
      const normRoute = route.replace(/^\/api\/v1/, '').replace(/^\/api/, '');
      const normUrl = cleanUrl.replace(/^\/api\/v1/, '').replace(/^\/api/, '');
      return normUrl.startsWith(normRoute);
    });

    const warehouseId = request.headers['x-warehouse-id'] as string | undefined;
    const branchId = request.headers['x-branch-id'] as string | undefined;
    const departmentId = request.headers['x-department-id'] as
      | string
      | undefined;

    const authenticatedUser = request.user;
    if (!authenticatedUser) {
      return next.handle();
    }

    const isKitchenChief = authenticatedUser.role === 'KITCHEN_CHIEF';
    const isBranchMgr = authenticatedUser.role === 'BRANCH_MGR';
    const isGlobal =
      authenticatedUser.role === 'ADMIN' || authenticatedUser.role === 'GM';

    const hasHeaders = isGlobal
      ? !!branchId
      : isKitchenChief
        ? !!(branchId && departmentId)
        : isBranchMgr
          ? !!branchId
          : !!(warehouseId && branchId);

    // If route is exempt and headers are missing, bypass scope checks entirely
    if (isExempt && !hasHeaders) {
      return next.handle();
    }

    // If headers are missing on a non-exempt route, reject
    if (!hasHeaders) {
      if (isExempt) {
        return next.handle();
      }
      if (isKitchenChief) {
        throw new BadRequestException(
          'Missing active scope headers: x-branch-id, x-department-id',
        );
      } else if (isBranchMgr) {
        throw new BadRequestException(
          'Missing active scope header: x-branch-id',
        );
      } else {
        throw new BadRequestException(
          'Missing active scope headers: x-warehouse-id, x-branch-id',
        );
      }
    }

    if (isGlobal) {
      request.activeScope = {
        warehouseId: warehouseId || '',
        branchId: branchId!,
        departmentId: departmentId || '',
      };
      return next.handle();
    }

    if (isKitchenChief) {
      const scope = await this.prisma.userDepartmentScope.findUnique({
        where: {
          userId_departmentId: {
            userId: authenticatedUser.id,
            departmentId: departmentId!,
          },
        },
        include: {
          department: {
            select: { branchId: true },
          },
        },
      });

      if (!scope || scope.department.branchId !== branchId) {
        throw new ForbiddenException(
          'Access denied: Department scope not authorized',
        );
      }

      request.activeScope = {
        warehouseId: warehouseId || '',
        branchId: branchId,
        departmentId: departmentId!,
      };
      return next.handle();
    }

    if (isBranchMgr) {
      const scope = await this.prisma.userBranchScope.findUnique({
        where: {
          userId_branchId: {
            userId: authenticatedUser.id,
            branchId: branchId!,
          },
        },
      });

      if (!scope) {
        throw new ForbiddenException(
          'Access denied: Branch scope not authorized',
        );
      }

      request.activeScope = {
        warehouseId: warehouseId || '',
        branchId: branchId!,
        departmentId: departmentId || '',
      };
      return next.handle();
    }

    let scope = null;
    try {
      scope = await this.prisma.userWarehouseScope.findUnique({
        where: {
          userId_warehouseId: {
            userId: authenticatedUser.id,
            warehouseId: warehouseId!,
          },
        },
        include: {
          warehouse: {
            select: { branchId: true },
          },
        },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const stack = e instanceof Error ? e.stack : undefined;
      const dbErr = e as { code?: string; message?: string };
      this.logger.error(
        `Database query failed in ScopeInterceptor: ${msg}`,
        stack,
      );
      const isOutage =
        (dbErr.code && String(dbErr.code).startsWith('P1')) ||
        (msg && /connection/i.test(msg));
      if (isOutage && !isExempt) {
        throw e;
      }
    }

    // If scope is not found or branchId does not match
    if (!scope || scope.warehouse.branchId !== branchId) {
      // If the route is exempt, do not enforce validation failure - proceed to controller
      if (isExempt) {
        return next.handle();
      }

      await this.prisma.auditLog.create({
        data: {
          userId: authenticatedUser.id,
          action: 'SCOPE_ACCESS_VIOLATION',
          targetTable: 'warehouses',
          targetId: warehouseId!,
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
      warehouseId: warehouseId!,
      branchId: branchId,
      departmentId: departmentId || '',
    };

    return next.handle();
  }
}
