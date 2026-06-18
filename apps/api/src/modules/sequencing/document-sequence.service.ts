import { Injectable, Logger } from '@nestjs/common';
import { Prisma, DocumentType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const PREFIX_MAP: Record<DocumentType, string> = {
  [DocumentType.PURCHASE_REQUEST]: 'PR',
  [DocumentType.PURCHASE_ORDER]: 'PO',
  [DocumentType.GOODS_RECEIVED_NOTE]: 'GRN',
  [DocumentType.INVENTORY_ISSUE]: 'ISS',
  [DocumentType.TRANSFER]: 'TRF',
  [DocumentType.ADJUSTMENT]: 'ADJ',
  [DocumentType.KITCHEN_REQUEST]: 'KR',
  [DocumentType.STOCKTAKE]: 'ST',
  [DocumentType.YIELD_BATCH]: 'YB',
};

@Injectable()
export class DocumentSequenceService {
  private readonly logger = new Logger(DocumentSequenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates the next sequential document number for a given document type, branch, and current calendar year.
   * Format: {DOC_PREFIX}-{YYYY}-{BRANCH_CODE}-{SEQUENCE_5_DIGITS}
   * Uses SELECT FOR UPDATE database locking to ensure concurrency safety.
   */
  async generateNext(
    tx: Prisma.TransactionClient,
    documentType: DocumentType,
    branchId: string,
  ): Promise<string> {
    const currentYear = new Date().getFullYear();
    const docPrefix = PREFIX_MAP[documentType] || documentType;

    // 1. Fetch branch code
    const branch = await tx.branch.findUnique({
      where: { id: branchId },
      select: { code: true },
    });
    if (!branch) {
      throw new Error(`Branch with ID ${branchId} not found`);
    }

    // 2. Lock and retrieve/create the sequence for the type, year, and branch
    const sequences = await tx.$queryRaw<
      Array<{ id: string; current_sequence: number }>
    >`
      SELECT id, current_sequence 
      FROM "document_sequences" 
      WHERE "document_type" = ${documentType}::"DocumentType" 
        AND "year" = ${currentYear} 
        AND "branch_id" = ${branchId} 
      FOR UPDATE
    `;

    let seqRecord: { id: string; current_sequence: number };

    if (sequences.length === 0) {
      try {
        const prefix = `${docPrefix}-${currentYear}-${branch.code}`;
        const newSeq = await tx.documentSequence.create({
          data: {
            branchId,
            documentType,
            year: currentYear,
            currentSequence: 1,
            prefix,
          },
        });
        seqRecord = { id: newSeq.id, current_sequence: 1 };
      } catch {
        // Handle potential race condition if row was created concurrently between select and insert
        const retrySeqs = await tx.$queryRaw<
          Array<{ id: string; current_sequence: number }>
        >`
          SELECT id, current_sequence 
          FROM "document_sequences" 
          WHERE "document_type" = ${documentType}::"DocumentType" 
            AND "year" = ${currentYear} 
            AND "branch_id" = ${branchId} 
          FOR UPDATE
        `;
        if (retrySeqs.length === 0) {
          throw new Error(
            'Failed to initialize document sequence due to concurrency error',
          );
        }
        const updatedSeq = await tx.documentSequence.update({
          where: { id: retrySeqs[0].id },
          data: { currentSequence: { increment: 1 } },
        });
        seqRecord = {
          id: updatedSeq.id,
          current_sequence: updatedSeq.currentSequence,
        };
      }
    } else {
      // Increment existing sequence
      const updatedSeq = await tx.documentSequence.update({
        where: { id: sequences[0].id },
        data: { currentSequence: { increment: 1 } },
      });
      seqRecord = {
        id: updatedSeq.id,
        current_sequence: updatedSeq.currentSequence,
      };
    }

    // 3. Format sequence to 5 digits padding
    const seqStr = String(seqRecord.current_sequence).padStart(5, '0');
    return `${docPrefix}-${currentYear}-${branch.code}-${seqStr}`;
  }
}
