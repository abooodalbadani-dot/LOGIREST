import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkflowService } from '../modules/workflow/workflow.service';
import { BYPASS_WAREHOUSE_LOCK_KEY } from '../decorators/bypass-warehouse-lock.decorator';

@Injectable()
export class WarehouseLockGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly workflowService: WorkflowService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. Bypass check: If decorator is present on route handler or controller class
    const bypass = this.reflector.getAllAndOverride<boolean>(
      BYPASS_WAREHOUSE_LOCK_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (bypass) {
      return true;
    }

    // 2. Safe methods bypass (GET, OPTIONS, HEAD)
    const method = request.method;
    if (['GET', 'OPTIONS', 'HEAD'].includes(method)) {
      return true;
    }

    // 3. Search for warehouse fields in body, params, or query
    const sources = [request.body, request.params, request.query];
    const warehouseIdsSet = new Set<string>();

    for (const source of sources) {
      if (source && typeof source === 'object') {
        const whId = source.warehouseId;
        const fromWhId = source.fromWarehouseId;
        const toWhId = source.toWarehouseId;

        if (typeof whId === 'string' && whId) warehouseIdsSet.add(whId);
        if (typeof fromWhId === 'string' && fromWhId)
          warehouseIdsSet.add(fromWhId);
        if (typeof toWhId === 'string' && toWhId) warehouseIdsSet.add(toWhId);
      }
    }

    // 4. Validate locked status for each warehouse ID identified
    for (const warehouseId of warehouseIdsSet) {
      const isLocked =
        await this.workflowService.isWarehouseLocked(warehouseId);
      if (isLocked) {
        throw new HttpException(
          'Warehouse is locked. Physical inventory mutations are blocked.',
          HttpStatus.LOCKED, // 423 Locked
        );
      }
    }

    return true;
  }
}
