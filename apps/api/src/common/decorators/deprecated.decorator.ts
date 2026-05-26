import { SetMetadata } from '@nestjs/common';

export const DEPRECATED_METADATA_KEY = 'deprecated';

export interface DeprecatedOptions {
  sunsetAt?: string; // ISO date string (YYYY-MM-DD)
}

export const Deprecated = (options: DeprecatedOptions = {}) =>
  SetMetadata(DEPRECATED_METADATA_KEY, {
    deprecated: true,
    ...options,
  });
