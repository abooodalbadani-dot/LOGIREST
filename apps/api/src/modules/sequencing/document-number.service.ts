import { Injectable, Logger } from '@nestjs/common';
import { Prisma, DocumentType } from '@prisma/client';

const PREFIX_MAP: Record<DocumentType | string, string> = {
  PURCHASE_REQUEST: 'PR',
  PURCHASE_ORDER: 'PO',
  GOODS_RECEIVED_NOTE: 'GRN',
  INVENTORY_ISSUE: 'ISS',
  TRANSFER: 'TRF',
  ADJUSTMENT: 'ADJ',
  KITCHEN_REQUEST: 'KR',
  STOCKTAKE: 'ST',
  LANDED_COST_VOUCHER: 'LCV',
};

@Injectable()
export class DocumentNumberService {
  private readonly logger = new Logger(DocumentNumberService.name);

  /**
   * Generates the next sequential document number atomically.
   * Format: {DOC_PREFIX}-{YYYY}-{BRANCH_CODE}-{SEQUENCE_5_DIGITS}
   */
  async next(
    tx: Prisma.TransactionClient,
    docType: DocumentType | string,
    branchId: string,
  ): Promise<string> {
    const branch = await tx.branch.findUnique({
      where: { id: branchId },
      select: { code: true },
    });
    if (!branch) {
      throw new Error(`Branch with ID ${branchId} not found`);
    }

    const currentYear = new Date().getFullYear();
    const docPrefix = PREFIX_MAP[docType] || docType;
    const branchCode = branch.code;

    const result = await tx.$queryRaw<
      Array<{ last_seq: number; year: number }>
    >`
      INSERT INTO document_counters (doc_type, branch_code, year, last_seq)
      VALUES (${docType}, ${branchCode}, ${currentYear}, 1)
      ON CONFLICT (doc_type, branch_code, year) DO UPDATE
        SET last_seq = document_counters.last_seq + 1
      RETURNING last_seq, year;
    `;

    if (!result || result.length === 0) {
      throw new Error(`Failed to generate sequence for ${docType}`);
    }

    const { last_seq } = result[0];
    const seqStr = String(last_seq).padStart(5, '0');

    const documentNumber = `${docPrefix}-${currentYear}-${branchCode}-${seqStr}`;
    this.logger.log(
      `Generated sequence number: ${documentNumber} for type ${docType}`,
    );
    return documentNumber;
  }
}
