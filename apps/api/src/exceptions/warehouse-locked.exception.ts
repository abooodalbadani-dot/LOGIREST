import { HttpException } from '@nestjs/common';

export class WarehouseLockedError extends HttpException {
  constructor(warehouseCode: string) {
    super(
      {
        statusCode: 423,
        error: 'Locked',
        code: 'WAREHOUSE_LOCKED',
        message: `Warehouse ${warehouseCode} is currently locked.`,
      },
      423,
    );
  }
}
