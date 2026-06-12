import { describe, it, expect } from 'vitest';
import { canPerformActionV2, type DocumentType } from './document-engine';

describe('canPerformActionV2', () => {
  // US3: Status locks should not be bypassable by role capabilities
  describe('status lock enforcement (takes precedence over role)', () => {
    it('should return false for POSTED kitchen request trying to SUBMIT (status lock)', () => {
      const result = canPerformActionV2(
        'kitchen_request',
        'FULFILLED',
        'SUBMIT',
        'ADMIN',
      );
      expect(result).toBe(false);
    });

    it('should return false for POSTED purchase request trying to APPROVE (status lock)', () => {
      const result = canPerformActionV2(
        'pr',
        'APPROVED',
        'SUBMIT',
        'ADMIN',
      );
      expect(result).toBe(false);
    });

    it('should return false for CANCELLED document with any role', () => {
      const result = canPerformActionV2(
        'pr',
        'CANCELLED',
        'SUBMIT',
        'ADMIN',
      );
      expect(result).toBe(false);
    });

    it('should return false for POSTED issue trying to POST again', () => {
      const result = canPerformActionV2(
        'issue',
        'POSTED',
        'POST',
        'ADMIN',
      );
      expect(result).toBe(false);
    });
  });

  describe('valid transitions still work', () => {
    it('should allow DRAFT kitchen request to SUBMIT for ADMIN', () => {
      const result = canPerformActionV2(
        'kitchen_request',
        'DRAFT',
        'SUBMIT',
        'ADMIN',
      );
      expect(result).toBe(true);
    });

    it('should allow DRAFT purchase request to SUBMIT for PROC_OFFICER', () => {
      const result = canPerformActionV2(
        'pr',
        'DRAFT',
        'SUBMIT',
        'PROC_OFFICER',
      );
      expect(result).toBe(true);
    });

    it('should allow APPROVED purchase request to CONVERT_TO_PO for ADMIN', () => {
      const result = canPerformActionV2(
        'pr',
        'APPROVED',
        'CONVERT_TO_PO',
        'ADMIN',
      );
      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should return false for missing role', () => {
      const result = canPerformActionV2('pr', 'DRAFT', 'SUBMIT');
      expect(result).toBe(false);
    });

    it('should return false for unknown document type', () => {
      const result = canPerformActionV2(
        'unknown' as DocumentType,
        'DRAFT',
        'SUBMIT',
        'ADMIN',
      );
      expect(result).toBe(false);
    });

    it('should return false for unknown action on valid status', () => {
      const result = canPerformActionV2(
        'pr',
        'DRAFT',
        'VOID',
        'ADMIN',
      );
      expect(result).toBe(false);
    });
  });
});
