import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { VersionConflictException } from '../exceptions/version-conflict.exception';

@Injectable()
export class ConcurrencyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves version conflict metadata and throws a VersionConflictException
   */
  async handleConflict(
    documentId: string,
    modelName: string,
    expectedVersion: number,
    tx?: any,
  ): Promise<never> {
    const prisma = tx || this.prisma;
    // 1. Fetch current version of the document from the database
    const doc = await prisma[modelName].findUnique({
      where: { id: documentId },
      select: { version: true, createdById: true },
    });

    if (!doc) {
      throw new NotFoundException(
        `Document not found: ${modelName} with ID ${documentId}`,
      );
    }

    const currentVersion = doc.version;

    // 2. Query the latest successful transition audit log matching the target ID
    const latestAuditLog = await prisma.auditLog.findFirst({
      where: {
        targetId: documentId,
        action: { endsWith: '_SUCCESS' },
      },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    });

    let lastModifiedBy = 'Unknown';
    let lastModifiedAt = new Date();

    if (latestAuditLog) {
      lastModifiedBy = latestAuditLog.user?.name || latestAuditLog.userId;
      lastModifiedAt = latestAuditLog.createdAt;
    } else if (doc.createdById) {
      // Fallback: Get document creator name if no successful workflow transitions are found
      const creator = await prisma.user.findUnique({
        where: { id: doc.createdById },
        select: { name: true },
      });
      if (creator) {
        lastModifiedBy = creator.name;
      }
    }

    throw new VersionConflictException(
      currentVersion,
      lastModifiedBy,
      lastModifiedAt,
    );
  }
}
