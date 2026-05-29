import { HttpException } from '@nestjs/common';

export class ItemFrozenException extends HttpException {
  constructor(sku: string) {
    super(
      {
        statusCode: 423,
        error: 'Locked',
        code: 'ITEM_FROZEN',
        message: `Item ${sku} is frozen due to a reconciliation discrepancy. Contact your inventory manager.`,
      },
      423,
    );
  }
}
