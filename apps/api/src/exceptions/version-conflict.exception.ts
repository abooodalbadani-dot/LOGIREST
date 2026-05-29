import { ConflictException } from '@nestjs/common';

export class VersionConflictException extends ConflictException {
  constructor(
    currentVersion: number,
    lastModifiedBy: string,
    lastModifiedAt: Date,
  ) {
    super({
      statusCode: 409,
      code: 'VERSION_CONFLICT',
      message:
        'Version conflict: Document has been updated by another process.',
      error: 'Conflict',
      currentVersion,
      lastModifiedBy,
      lastModifiedAt,
    });
  }
}
