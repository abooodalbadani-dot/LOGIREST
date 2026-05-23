import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_METADATA_KEY = 'isIdempotent';

/**
 * Decorator to enforce idempotency on POST requests using the x-idempotency-key header.
 */
export const Idempotent = () => SetMetadata(IDEMPOTENT_METADATA_KEY, true);
