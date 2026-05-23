import { SetMetadata } from '@nestjs/common';

export const BYPASS_WAREHOUSE_LOCK_KEY = 'bypassWarehouseLock';

/**
 * Decorator to bypass warehouse locking checks for specific routes or controllers.
 */
export const BypassWarehouseLock = () =>
  SetMetadata(BYPASS_WAREHOUSE_LOCK_KEY, true);
